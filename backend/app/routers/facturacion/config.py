from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_org
from app.models.facturacion.models import FacConfig, TasaIVA

router = APIRouter(prefix="/facturacion/config", tags=["facturacion"])


class FacConfigOut(BaseModel):
    codigo_establecimiento: str
    punto_expedicion: str
    siguiente_numero: int
    timbrado: str | None
    timbrado_vigencia_desde: datetime | None
    timbrado_vigencia_hasta: datetime | None
    tasa_iva_default: str
    precio_incluye_iva: bool
    ruc: str | None
    razon_social: str | None
    direccion_fiscal: str | None
    telefono_fiscal: str | None
    # Integración elec-cano
    factura_electronica_activa: bool
    elec_url: str | None
    elec_api_key: str | None

    class Config:
        from_attributes = True


class FacConfigUpdate(BaseModel):
    codigo_establecimiento: str | None = None
    punto_expedicion: str | None = None
    timbrado: str | None = None
    timbrado_vigencia_desde: datetime | None = None
    timbrado_vigencia_hasta: datetime | None = None
    tasa_iva_default: TasaIVA | None = None
    precio_incluye_iva: bool | None = None
    ruc: str | None = None
    razon_social: str | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    elec_url: str | None = None
    elec_api_key: str | None = None


async def _get_or_create(org_id: int, db: AsyncSession) -> FacConfig:
    result = await db.execute(select(FacConfig).where(FacConfig.organizacion_id == org_id))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = FacConfig(organizacion_id=org_id)
        db.add(cfg)
        await db.flush()
    return cfg


@router.get("/", response_model=FacConfigOut)
async def get_config(org=Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    return await _get_or_create(org.id, db)


@router.put("/", response_model=FacConfigOut)
async def update_config(
    data: FacConfigUpdate,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cfg = await _get_or_create(org.id, db)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cfg, k, v)
    await db.flush()
    return cfg
