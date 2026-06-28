from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro, require_roles
from app.models.belleza.servicio import Servicio

router = APIRouter(prefix="/belleza/servicios", tags=["belleza"])

_require = require_rubro("belleza")


class ServicioOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    duracion_minutos: int
    precio: float
    activo: bool

    class Config:
        from_attributes = True


class ServicioCreate(BaseModel):
    nombre: str
    descripcion: str | None = None
    duracion_minutos: int = 30
    precio: float


@router.get("/", response_model=list[ServicioOut])
async def list_servicios(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Servicio).where(Servicio.organizacion_id == org.id, Servicio.activo == True)
    )
    return result.scalars().all()


@router.post("/", response_model=ServicioOut, status_code=201)
async def create_servicio(
    data: ServicioCreate,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    servicio = Servicio(**data.model_dump(), organizacion_id=org.id)
    db.add(servicio)
    await db.flush()
    return servicio
