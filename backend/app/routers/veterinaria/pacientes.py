from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import date, datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_rubro
from app.models.veterinaria.paciente import Paciente, Sexo
from app.models.veterinaria.propietario import Propietario

router = APIRouter(prefix="/veterinaria/pacientes", tags=["veterinaria"])

_require = require_rubro("veterinaria")


class PropietarioOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    telefono: str | None

    class Config:
        from_attributes = True


class PacienteOut(BaseModel):
    id: int
    nombre: str
    especie: str
    raza: str | None
    color: str | None
    sexo: str
    fecha_nacimiento: date | None
    esterilizado: bool
    foto_url: str | None
    activo: bool
    propietario: PropietarioOut | None

    class Config:
        from_attributes = True


class PacienteCreate(BaseModel):
    propietario_id: int
    nombre: str
    especie: str
    raza: str | None = None
    color: str | None = None
    sexo: Sexo = Sexo.desconocido
    fecha_nacimiento: date | None = None
    esterilizado: bool = False
    foto_url: str | None = None


@router.get("/", response_model=list[PacienteOut])
async def list_pacientes(
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Paciente)
        .options(selectinload(Paciente.propietario))
        .where(Paciente.organizacion_id == org.id, Paciente.activo == True)
        .order_by(Paciente.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=PacienteOut, status_code=201)
async def create_paciente(
    data: PacienteCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    prop = await db.get(Propietario, data.propietario_id)
    if not prop or prop.organizacion_id != org.id:
        raise HTTPException(404, "Propietario no encontrado")

    paciente = Paciente(**data.model_dump(), organizacion_id=org.id)
    db.add(paciente)
    await db.flush()
    await db.refresh(paciente, ["propietario"])
    return paciente


class PacienteUpdate(BaseModel):
    nombre: str | None = None
    especie: str | None = None
    raza: str | None = None
    color: str | None = None
    sexo: Sexo | None = None
    fecha_nacimiento: date | None = None
    esterilizado: bool | None = None


@router.patch("/{paciente_id}", response_model=PacienteOut)
async def update_paciente(
    paciente_id: int,
    data: PacienteUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Paciente)
        .options(selectinload(Paciente.propietario))
        .where(Paciente.id == paciente_id, Paciente.organizacion_id == org.id)
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(paciente, k, v)
    db.add(paciente)
    return paciente


@router.get("/{paciente_id}", response_model=PacienteOut)
async def get_paciente(
    paciente_id: int,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Paciente)
        .options(selectinload(Paciente.propietario))
        .where(Paciente.id == paciente_id, Paciente.organizacion_id == org.id)
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    return paciente


@router.delete("/{paciente_id}", status_code=204)
async def delete_paciente(
    paciente_id: int,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Paciente).where(Paciente.id == paciente_id, Paciente.organizacion_id == org.id)
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(404)
    paciente.activo = False
    db.add(paciente)
