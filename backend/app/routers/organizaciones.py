from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_roles, require_superadmin
from app.models.organizacion import Organizacion, RubroNegocio, PlanOrg, EstadoOrg

router = APIRouter(prefix="/organizaciones", tags=["organizaciones"])


class OrgOut(BaseModel):
    id: int
    nombre: str
    ruc: str | None
    rubro: str
    plan: str
    estado: str
    activo: bool
    logo_url: str | None
    configuracion: dict

    class Config:
        from_attributes = True


class OrgUpdate(BaseModel):
    nombre: str | None = None
    ruc: str | None = None
    logo_url: str | None = None
    configuracion: dict | None = None


@router.get("/mi-organizacion", response_model=OrgOut)
async def get_mi_org(org=Depends(get_current_org)):
    return org


@router.patch("/mi-organizacion", response_model=OrgOut)
async def update_mi_org(
    data: OrgUpdate,
    current_user=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    if data.nombre is not None:
        org.nombre = data.nombre
    if data.ruc is not None:
        org.ruc = data.ruc
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.configuracion is not None:
        org.configuracion = {**org.configuracion, **data.configuracion}
    db.add(org)
    return org


@router.get("/", response_model=list[OrgOut])
async def list_orgs(
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organizacion).order_by(Organizacion.id))
    return result.scalars().all()
