from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_rubro
from app.models.roperia.venta import Venta, ItemVenta, MetodoPago, EstadoVenta
from app.models.roperia.producto import Producto

router = APIRouter(prefix="/roperia/ventas", tags=["roperia"])

_require = require_rubro("roperia")


class ItemIn(BaseModel):
    producto_id: int
    cantidad: int
    variante: dict = {}


class VentaCreate(BaseModel):
    items: list[ItemIn]
    metodo_pago: MetodoPago = MetodoPago.efectivo
    descuento: float = 0
    cliente_nombre: str | None = None
    notas: str | None = None


class ItemOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    variante: dict

    class Config:
        from_attributes = True


class VentaOut(BaseModel):
    id: int
    total: float
    descuento: float
    metodo_pago: str
    estado: str
    cliente_nombre: str | None
    created_at: datetime
    items: list[ItemOut]

    class Config:
        from_attributes = True


@router.post("/", response_model=VentaOut, status_code=201)
async def crear_venta(
    data: VentaCreate,
    current_user=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    total = 0.0
    items_db = []

    for item in data.items:
        result = await db.execute(
            select(Producto).where(Producto.id == item.producto_id, Producto.organizacion_id == org.id)
        )
        producto = result.scalar_one_or_none()
        if not producto:
            raise HTTPException(404, f"Producto {item.producto_id} no encontrado")
        if producto.stock < item.cantidad:
            raise HTTPException(400, f"Stock insuficiente para '{producto.nombre}' (disponible: {producto.stock})")

        subtotal = float(producto.precio_venta) * item.cantidad
        total += subtotal
        producto.stock -= item.cantidad
        db.add(producto)

        items_db.append(ItemVenta(
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=float(producto.precio_venta),
            subtotal=subtotal,
            variante=item.variante,
        ))

    total_final = total - data.descuento
    venta = Venta(
        organizacion_id=org.id,
        cajero_id=current_user.id,
        total=total_final,
        descuento=data.descuento,
        metodo_pago=data.metodo_pago,
        cliente_nombre=data.cliente_nombre,
        notas=data.notas,
        estado=EstadoVenta.completada,
    )
    db.add(venta)
    await db.flush()

    for item in items_db:
        item.venta_id = venta.id
        db.add(item)

    return venta


@router.get("/", response_model=list[VentaOut])
async def list_ventas(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Venta).where(Venta.organizacion_id == org.id).order_by(Venta.created_at.desc())
    )
    return result.scalars().all()
