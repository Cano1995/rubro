from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_org
from app.models.facturacion.models import FacConfig, TasaIVA
from app.services import elec_cano_client

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


def _require_elec_activa(cfg: FacConfig):
    if not cfg.factura_electronica_activa:
        raise HTTPException(403, "La facturación electrónica no está activada para tu organización")


# ─── Contribuyente multi-tenant en elec-cano (RUC, timbrado, certificado) ─────

@router.post("/contribuyente/sincronizar")
async def sincronizar_contribuyente(org=Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    """Registra/actualiza en elec-cano el RUC, razón social y timbrado de esta organización."""
    cfg = await _get_or_create(org.id, db)
    _require_elec_activa(cfg)
    try:
        return await elec_cano_client.sincronizar_contribuyente(cfg)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"Error al conectar con elec-cano: {str(e)}")


@router.get("/contribuyente/estado")
async def estado_contribuyente(org=Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    """Consulta en elec-cano si el contribuyente está registrado y si tiene certificado cargado."""
    cfg = await _get_or_create(org.id, db)
    _require_elec_activa(cfg)
    try:
        estado = await elec_cano_client.estado_contribuyente(cfg)
    except Exception as e:
        raise HTTPException(502, f"Error al conectar con elec-cano: {str(e)}")
    return estado or {"registrado": False}


@router.post("/contribuyente/certificado")
async def subir_certificado(
    archivo: UploadFile = File(...),
    password: str = Form(...),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Sube el certificado de firma digital (.pfx/.p12) de esta organización a elec-cano."""
    cfg = await _get_or_create(org.id, db)
    _require_elec_activa(cfg)
    contenido = await archivo.read()
    try:
        return await elec_cano_client.subir_certificado(
            cfg, contenido, archivo.filename or "certificado.pfx", password
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"Error al conectar con elec-cano: {str(e)}")


@router.delete("/contribuyente/certificado")
async def eliminar_certificado(org=Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    """Elimina el certificado cargado en elec-cano (para rotarlo)."""
    cfg = await _get_or_create(org.id, db)
    _require_elec_activa(cfg)
    try:
        return await elec_cano_client.eliminar_certificado(cfg)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"Error al conectar con elec-cano: {str(e)}")
