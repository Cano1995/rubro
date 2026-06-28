from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_rubro
from app.models.veterinaria.cita import CitaVet, EstadoCita

router = APIRouter(prefix="/veterinaria/citas", tags=["veterinaria"])

_require = require_rubro("veterinaria")


class CitaOut(BaseModel):
    id: int
    paciente_id: int
    veterinario_id: int | None
    fecha_hora: datetime
    motivo: str
    estado: str
    notas: str | None

    class Config:
        from_attributes = True


class CitaCreate(BaseModel):
    paciente_id: int
    veterinario_id: int | None = None
    fecha_hora: datetime
    motivo: str
    notas: str | None = None


class CitaUpdate(BaseModel):
    fecha_hora: datetime | None = None
    estado: EstadoCita | None = None
    notas: str | None = None


@router.get("/", response_model=list[CitaOut])
async def list_citas(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CitaVet).where(CitaVet.organizacion_id == org.id).order_by(CitaVet.fecha_hora)
    )
    return result.scalars().all()


@router.post("/", response_model=CitaOut, status_code=201)
async def create_cita(
    data: CitaCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cita = CitaVet(**data.model_dump(), organizacion_id=org.id)
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
        select(CitaVet).where(CitaVet.id == cita_id, CitaVet.organizacion_id == org.id)
    )
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cita, k, v)
    db.add(cita)
    return cita
