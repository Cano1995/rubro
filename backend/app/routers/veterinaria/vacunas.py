from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import date, datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_rubro
from app.models.veterinaria.vacuna import Vacuna

router = APIRouter(prefix="/veterinaria/vacunas", tags=["veterinaria"])

_require = require_rubro("veterinaria")


class VacunaOut(BaseModel):
    id: int
    paciente_id: int
    nombre_vacuna: str
    lote: str | None
    fecha_aplicacion: date
    fecha_vencimiento: date | None
    veterinario_id: int | None
    recordatorio_enviado: bool

    class Config:
        from_attributes = True


class VacunaCreate(BaseModel):
    paciente_id: int
    nombre_vacuna: str
    lote: str | None = None
    fecha_aplicacion: date
    fecha_vencimiento: date | None = None
    veterinario_id: int | None = None


class VacunaUpdate(BaseModel):
    nombre_vacuna: str | None = None
    lote: str | None = None
    fecha_vencimiento: date | None = None
    recordatorio_enviado: bool | None = None


@router.get("/", response_model=list[VacunaOut])
async def list_vacunas(
    paciente_id: int | None = None,
    vencidas: bool = False,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(Vacuna).where(Vacuna.organizacion_id == org.id)
    if paciente_id:
        query = query.where(Vacuna.paciente_id == paciente_id)
    if vencidas:
        from datetime import date as d
        query = query.where(Vacuna.fecha_vencimiento < d.today())
    query = query.order_by(Vacuna.fecha_aplicacion.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=VacunaOut, status_code=201)
async def create_vacuna(
    data: VacunaCreate,
    current_user=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    vacuna = Vacuna(
        **data.model_dump(),
        organizacion_id=org.id,
        veterinario_id=data.veterinario_id or current_user.id,
    )
    db.add(vacuna)
    await db.flush()
    return vacuna


@router.patch("/{vacuna_id}", response_model=VacunaOut)
async def update_vacuna(
    vacuna_id: int,
    data: VacunaUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vacuna).where(Vacuna.id == vacuna_id, Vacuna.organizacion_id == org.id)
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404)
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    db.add(v)
    return v


@router.delete("/{vacuna_id}", status_code=204)
async def delete_vacuna(
    vacuna_id: int,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vacuna).where(Vacuna.id == vacuna_id, Vacuna.organizacion_id == org.id)
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404)
    await db.delete(v)
