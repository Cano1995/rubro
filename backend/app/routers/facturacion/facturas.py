from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.models.facturacion.models import (
    Factura, FacturaItem, FacturaPago, FacConfig, FacCliente,
    TasaIVA, EstadoFactura, CondicionVenta,
)
from app.services.facturacion import calcular_item_iva, calcular_totales, generar_numero_factura

router = APIRouter(prefix="/facturacion/facturas", tags=["facturacion"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ItemIn(BaseModel):
    descripcion: str
    cantidad: float
    precio_unitario: float
    tasa_iva: TasaIVA = TasaIVA.IVA_10
    precio_incluye_iva: bool = True


class FacturaCreate(BaseModel):
    cliente_id: int | None = None
    condicion: CondicionVenta = CondicionVenta.CONTADO
    fecha_vencimiento: datetime | None = None
    items: list[ItemIn]
    notas: str | None = None


class ItemOut(BaseModel):
    id: int
    descripcion: str
    cantidad: float
    precio_unitario: float
    tasa_iva: str
    precio_incluye_iva: bool
    subtotal: float
    monto_iva: float
    total: float
    orden: int

    class Config:
        from_attributes = True


class PagoOut(BaseModel):
    id: int
    monto: float
    fecha: datetime
    metodo_pago: str
    referencia: str | None
    notas: str | None

    class Config:
        from_attributes = True


class ClienteBasicoOut(BaseModel):
    id: int
    nombre: str
    ruc: str | None

    class Config:
        from_attributes = True


class FacturaOut(BaseModel):
    id: int
    numero: str
    fecha: datetime
    condicion: str
    estado: str
    total_base: float
    total_iva10: float
    total_iva5: float
    total_exento: float
    total_general: float
    notas: str | None
    cliente: ClienteBasicoOut | None
    items: list[ItemOut]
    pagos: list[PagoOut]

    class Config:
        from_attributes = True


class PagoIn(BaseModel):
    monto: float
    metodo_pago: str = "efectivo"
    referencia: str | None = None
    notas: str | None = None


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _load_factura(factura_id: int, org_id: int, db: AsyncSession) -> Factura:
    result = await db.execute(
        select(Factura)
        .options(
            selectinload(Factura.cliente),
            selectinload(Factura.items),
            selectinload(Factura.pagos),
        )
        .where(Factura.id == factura_id, Factura.organizacion_id == org_id)
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Factura no encontrada")
    return f


async def _get_or_create_config(org_id: int, db: AsyncSession) -> FacConfig:
    result = await db.execute(select(FacConfig).where(FacConfig.organizacion_id == org_id))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = FacConfig(organizacion_id=org_id)
        db.add(cfg)
        await db.flush()
    return cfg


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[FacturaOut])
async def list_facturas(
    estado: str | None = None,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Factura)
        .options(
            selectinload(Factura.cliente),
            selectinload(Factura.items),
            selectinload(Factura.pagos),
        )
        .where(Factura.organizacion_id == org.id)
    )
    if estado:
        query = query.where(Factura.estado == estado)
    query = query.order_by(Factura.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=FacturaOut, status_code=201)
async def create_factura(
    data: FacturaCreate,
    current_user=Depends(get_current_user),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    if not data.items:
        raise HTTPException(400, "La factura debe tener al menos un ítem")

    if data.cliente_id:
        r = await db.execute(
            select(FacCliente).where(
                FacCliente.id == data.cliente_id, FacCliente.organizacion_id == org.id
            )
        )
        if not r.scalar_one_or_none():
            raise HTTPException(404, "Cliente no encontrado")

    # Calcular ítems e IVA
    items_calc = []
    for i, it in enumerate(data.items):
        calc = calcular_item_iva(it.precio_unitario, it.cantidad, it.tasa_iva.value, it.precio_incluye_iva)
        items_calc.append({**it.model_dump(), **calc, "tasa_iva": it.tasa_iva.value, "orden": i + 1})

    totales = calcular_totales(items_calc)

    # Generar número correlativo formato DNIT paraguayo
    cfg = await _get_or_create_config(org.id, db)
    numero, cfg.siguiente_numero, cfg.serie = generar_numero_factura(cfg)

    factura = Factura(
        organizacion_id=org.id,
        cliente_id=data.cliente_id,
        usuario_id=current_user.id,
        numero=numero,
        condicion=data.condicion,
        fecha_vencimiento=data.fecha_vencimiento,
        notas=data.notas,
        **totales,
    )
    db.add(factura)
    await db.flush()

    for ic in items_calc:
        db.add(FacturaItem(
            factura_id=factura.id,
            descripcion=ic["descripcion"],
            cantidad=ic["cantidad"],
            precio_unitario=ic["precio_unitario"],
            tasa_iva=ic["tasa_iva"],
            precio_incluye_iva=ic["precio_incluye_iva"],
            subtotal=ic["subtotal"],
            monto_iva=ic["monto_iva"],
            total=ic["total"],
            orden=ic["orden"],
        ))

    await db.flush()
    await db.refresh(factura, ["items", "pagos", "cliente"])
    return factura


@router.get("/{factura_id}", response_model=FacturaOut)
async def get_factura(
    factura_id: int,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    return await _load_factura(factura_id, org.id, db)


@router.post("/{factura_id}/pagos", response_model=FacturaOut, status_code=201)
async def registrar_pago(
    factura_id: int,
    data: PagoIn,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    factura = await _load_factura(factura_id, org.id, db)
    if factura.estado == EstadoFactura.CANCELADA:
        raise HTTPException(400, "No se puede registrar un pago en una factura cancelada")

    db.add(FacturaPago(factura_id=factura.id, **data.model_dump()))

    total_pagado = sum(float(p.monto) for p in factura.pagos) + data.monto
    if total_pagado >= float(factura.total_general):
        factura.estado = EstadoFactura.PAGADA

    await db.flush()
    await db.refresh(factura, ["items", "pagos", "cliente"])
    return factura


@router.post("/{factura_id}/cancelar", response_model=FacturaOut)
async def cancelar_factura(
    factura_id: int,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    factura = await _load_factura(factura_id, org.id, db)
    if factura.estado == EstadoFactura.CANCELADA:
        raise HTTPException(400, "La factura ya está cancelada")
    factura.estado = EstadoFactura.CANCELADA
    return factura
