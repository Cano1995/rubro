from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import require_superadmin
from app.models.organizacion import Organizacion, PlanOrg, EstadoOrg
from app.models.usuario import Usuario
from app.models.suscripcion import Suscripcion

router = APIRouter(prefix="/admin", tags=["admin"])


class OrgAdminOut(BaseModel):
    id: int
    nombre: str
    rubro: str
    plan: str
    estado: str
    activo: bool
    created_at: datetime
    total_usuarios: int = 0

    class Config:
        from_attributes = True


class PlanUpdate(BaseModel):
    plan: PlanOrg
    estado: EstadoOrg
    fecha_vencimiento: datetime | None = None


@router.get("/stats")
async def get_stats(_=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    total_orgs = await db.scalar(select(func.count()).select_from(Organizacion))
    total_usuarios = await db.scalar(select(func.count()).select_from(Usuario).where(Usuario.rol != "superadmin"))
    orgs_activas = await db.scalar(select(func.count()).where(Organizacion.activo == True))
    return {
        "total_organizaciones": total_orgs,
        "total_usuarios": total_usuarios,
        "organizaciones_activas": orgs_activas,
    }


@router.get("/organizaciones", response_model=list[OrgAdminOut])
async def list_orgs_admin(_=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organizacion).order_by(Organizacion.created_at.desc()))
    orgs = result.scalars().all()

    out = []
    for org in orgs:
        count = await db.scalar(
            select(func.count()).where(Usuario.organizacion_id == org.id)
        )
        out.append({**org.__dict__, "total_usuarios": count or 0})
    return out


@router.patch("/organizaciones/{org_id}/plan")
async def update_plan(
    org_id: int,
    data: PlanUpdate,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organización no encontrada")

    org.plan = data.plan
    org.estado = data.estado
    db.add(org)

    suscripcion = Suscripcion(
        organizacion_id=org.id,
        plan=data.plan.value,
        fecha_vencimiento=data.fecha_vencimiento,
    )
    db.add(suscripcion)
    return {"ok": True, "org_id": org_id, "plan": data.plan, "estado": data.estado}


@router.patch("/organizaciones/{org_id}/toggle")
async def toggle_org(org_id: int, _=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404)
    org.activo = not org.activo
    db.add(org)
    return {"org_id": org_id, "activo": org.activo}
