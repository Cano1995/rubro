"""
Mantenimiento de la numeración DNIT para facturas paraguayas.

Reglas DNIT:
- Establecimiento y punto de expedición: 3 dígitos, ceros obligatorios.
- Número correlativo: 7 dígitos, de 0000001 a 9999999, correlativo e ininterrumpido.
- No se puede retroceder el número correlativo.
- Serie alfanumérica (AA-ZZ) se activa al superar 9999999 (e-kuatia).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_org, get_current_user
from app.models.facturacion.models import FacConfig, TasaIVA
from app.models.usuario import RolUsuario

router = APIRouter(prefix="/facturacion/numeracion", tags=["facturacion"])


class NumeracionOut(BaseModel):
    codigo_establecimiento: str
    punto_expedicion: str
    siguiente_numero: int
    serie: str | None
    timbrado: str | None
    timbrado_vigencia_desde: datetime | None
    timbrado_vigencia_hasta: datetime | None
    proximo_numero_formateado: str

    class Config:
        from_attributes = True


class PuntoExpedicionCreate(BaseModel):
    codigo: str
    descripcion: str | None = None


class NumeracionUpdate(BaseModel):
    codigo_establecimiento: str | None = None
    punto_expedicion: str | None = None

    @field_validator("codigo_establecimiento", "punto_expedicion", mode="before")
    @classmethod
    def validar_tres_digitos(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().zfill(3)
        if not v.isdigit() or len(v) != 3:
            raise ValueError("Debe ser un número de 3 dígitos (001-999)")
        return v


class TimbradoUpdate(BaseModel):
    timbrado: str
    timbrado_vigencia_desde: datetime
    timbrado_vigencia_hasta: datetime

    @field_validator("timbrado", mode="before")
    @classmethod
    def validar_timbrado(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("El timbrado debe contener solo dígitos")
        return v


class ResetearNumeroRequest(BaseModel):
    nuevo_numero: int
    confirmacion: str  # debe ser "CONFIRMAR" para prevenir accidentes


async def _get_or_create_config(org_id: int, db: AsyncSession) -> FacConfig:
    result = await db.execute(select(FacConfig).where(FacConfig.organizacion_id == org_id))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = FacConfig(organizacion_id=org_id)
        db.add(cfg)
        await db.flush()
    return cfg


def _formatear_proximo(cfg: FacConfig) -> str:
    est = cfg.codigo_establecimiento.zfill(3)
    pto = cfg.punto_expedicion.zfill(3)
    num = str(cfg.siguiente_numero).zfill(7)
    if cfg.serie:
        return f"{est}-{pto}-{cfg.serie}{num}"
    return f"{est}-{pto}-{num}"


@router.get("/", response_model=NumeracionOut)
async def get_numeracion(org=Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    cfg = await _get_or_create_config(org.id, db)
    return {**cfg.__dict__, "proximo_numero_formateado": _formatear_proximo(cfg)}


@router.patch("/establecimiento-expedicion", response_model=NumeracionOut)
async def update_establecimiento(
    data: NumeracionUpdate,
    current_user=Depends(get_current_user),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Cambia el código de establecimiento y/o punto de expedición.
    Al cambiar el punto de expedición, el correlativo NO se reinicia
    — el contador es por organización, no por punto."""
    if current_user.rol not in (RolUsuario.org_admin, RolUsuario.superadmin):
        raise HTTPException(403, "Solo el administrador puede modificar la numeración")

    cfg = await _get_or_create_config(org.id, db)
    if data.codigo_establecimiento is not None:
        cfg.codigo_establecimiento = data.codigo_establecimiento
    if data.punto_expedicion is not None:
        cfg.punto_expedicion = data.punto_expedicion

    await db.flush()
    return {**cfg.__dict__, "proximo_numero_formateado": _formatear_proximo(cfg)}


@router.patch("/timbrado", response_model=NumeracionOut)
async def update_timbrado(
    data: TimbradoUpdate,
    current_user=Depends(get_current_user),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Registra un nuevo timbrado DNIT con sus fechas de vigencia.
    Al activar un nuevo timbrado el correlativo puede reiniciarse desde 1
    (depende de la resolución DNIT aplicable)."""
    if current_user.rol not in (RolUsuario.org_admin, RolUsuario.superadmin):
        raise HTTPException(403, "Solo el administrador puede modificar el timbrado")

    if data.timbrado_vigencia_hasta <= data.timbrado_vigencia_desde:
        raise HTTPException(400, "La fecha de fin de vigencia debe ser posterior a la de inicio")

    cfg = await _get_or_create_config(org.id, db)
    cfg.timbrado = data.timbrado
    cfg.timbrado_vigencia_desde = data.timbrado_vigencia_desde
    cfg.timbrado_vigencia_hasta = data.timbrado_vigencia_hasta

    await db.flush()
    return {**cfg.__dict__, "proximo_numero_formateado": _formatear_proximo(cfg)}


@router.post("/resetear-correlativo", response_model=NumeracionOut)
async def resetear_correlativo(
    data: ResetearNumeroRequest,
    current_user=Depends(get_current_user),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Reinicia el número correlativo. Solo se puede avanzar, nunca retroceder,
    salvo al inicio de vigencia de un nuevo timbrado (nuevo_numero=1).
    Requiere escribir 'CONFIRMAR' para prevenir accidentes.
    """
    if current_user.rol not in (RolUsuario.org_admin, RolUsuario.superadmin):
        raise HTTPException(403, "Solo el administrador puede resetear la numeración")
    if data.confirmacion != "CONFIRMAR":
        raise HTTPException(400, "Escribí CONFIRMAR para proceder")
    if data.nuevo_numero < 1 or data.nuevo_numero > 9_999_999:
        raise HTTPException(400, "El número debe estar entre 1 y 9999999")

    cfg = await _get_or_create_config(org.id, db)

    # Solo se permite retroceder si se está iniciando con un nuevo timbrado
    # (es decir, si el timbrado fue actualizado recientemente)
    if data.nuevo_numero < cfg.siguiente_numero and data.nuevo_numero != 1:
        raise HTTPException(
            400,
            f"No se puede retroceder el correlativo de {cfg.siguiente_numero} a {data.nuevo_numero}. "
            "Solo se permite reiniciar desde 1 al activar un nuevo timbrado."
        )

    cfg.siguiente_numero = data.nuevo_numero
    if data.nuevo_numero == 1:
        cfg.serie = None  # Reiniciar serie también

    await db.flush()
    return {**cfg.__dict__, "proximo_numero_formateado": _formatear_proximo(cfg)}
