from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro
from app.models.belleza.cita import CitaBelleza, EstadoCitaBelleza

router = APIRouter(prefix="/belleza/citas", tags=["belleza"])

_require = require_rubro("belleza")


class CitaOut(BaseModel):
    id: int
    cliente_id: int
    staff_id: int | None
    servicio_id: int
    fecha_hora: datetime
    estado: str
    precio_cobrado: float | None
    notas: str | None

    class Config:
        from_attributes = True


class CitaCreate(BaseModel):
    cliente_id: int
    staff_id: int | None = None
    servicio_id: int
    fecha_hora: datetime
    notas: str | None = None


class CitaUpdate(BaseModel):
    fecha_hora: datetime | None = None
    estado: EstadoCitaBelleza | None = None
    precio_cobrado: float | None = None
    notas: str | None = None


@router.get("/", response_model=list[CitaOut])
async def list_citas(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CitaBelleza).where(CitaBelleza.organizacion_id == org.id).order_by(CitaBelleza.fecha_hora)
    )
    return result.scalars().all()


@router.post("/", response_model=CitaOut, status_code=201)
async def create_cita(
    data: CitaCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cita = CitaBelleza(**data.model_dump(), organizacion_id=org.id)
    db.add(cita)
    await db.flush()
    return cita


@router.patch("/{cita_id}", response_model=CitaOut)
async def update_cita(
    cita_id: int,
    data: CitaUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CitaBelleza).where(CitaBelleza.id == cita_id, CitaBelleza.organizacion_id == org.id)
    )
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cita, k, v)
    db.add(cita)
    return cita
