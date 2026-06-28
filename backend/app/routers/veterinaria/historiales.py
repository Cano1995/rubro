from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org, require_rubro
from app.models.veterinaria.historial import HistorialMedico

router = APIRouter(prefix="/veterinaria/historiales", tags=["veterinaria"])

_require = require_rubro("veterinaria")


class HistorialOut(BaseModel):
    id: int
    paciente_id: int
    veterinario_id: int | None
    fecha: datetime
    motivo_consulta: str
    diagnostico: str | None
    tratamiento: str | None
    medicamentos: str | None
    peso_kg: float | None
    temperatura: float | None
    proxima_cita: datetime | None

    class Config:
        from_attributes = True


class HistorialCreate(BaseModel):
    paciente_id: int
    veterinario_id: int | None = None
    fecha: datetime
    motivo_consulta: str
    diagnostico: str | None = None
    tratamiento: str | None = None
    medicamentos: str | None = None
    peso_kg: float | None = None
    temperatura: float | None = None
    proxima_cita: datetime | None = None


class HistorialUpdate(BaseModel):
    diagnostico: str | None = None
    tratamiento: str | None = None
    medicamentos: str | None = None
    peso_kg: float | None = None
    temperatura: float | None = None
    proxima_cita: datetime | None = None


@router.get("/", response_model=list[HistorialOut])
async def list_historiales(
    paciente_id: int | None = None,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(HistorialMedico).where(HistorialMedico.organizacion_id == org.id)
    if paciente_id:
        query = query.where(HistorialMedico.paciente_id == paciente_id)
    query = query.order_by(HistorialMedico.fecha.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=HistorialOut, status_code=201)
async def create_historial(
    data: HistorialCreate,
    current_user=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    historial = HistorialMedico(
        **data.model_dump(),
        organizacion_id=org.id,
        veterinario_id=data.veterinario_id or current_user.id,
    )
    db.add(historial)
    await db.flush()
    return historial


@router.get("/{historial_id}", response_model=HistorialOut)
async def get_historial(
    historial_id: int,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HistorialMedico).where(
            HistorialMedico.id == historial_id,
            HistorialMedico.organizacion_id == org.id,
        )
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(404, "Historial no encontrado")
    return h


@router.patch("/{historial_id}", response_model=HistorialOut)
async def update_historial(
    historial_id: int,
    data: HistorialUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HistorialMedico).where(
            HistorialMedico.id == historial_id,
            HistorialMedico.organizacion_id == org.id,
        )
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(h, k, v)
    db.add(h)
    return h


@router.delete("/{historial_id}", status_code=204)
async def delete_historial(
    historial_id: int,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HistorialMedico).where(
            HistorialMedico.id == historial_id,
            HistorialMedico.organizacion_id == org.id,
        )
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(404)
    await db.delete(h)
