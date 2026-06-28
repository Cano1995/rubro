from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro
from app.models.veterinaria.propietario import Propietario

router = APIRouter(prefix="/veterinaria/propietarios", tags=["veterinaria"])

_require = require_rubro("veterinaria")


class PropietarioOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    ci: str | None
    telefono: str | None
    email: str | None
    direccion: str | None

    class Config:
        from_attributes = True


class PropietarioCreate(BaseModel):
    nombre: str
    apellido: str
    ci: str | None = None
    telefono: str | None = None
    email: EmailStr | None = None
    direccion: str | None = None


@router.get("/", response_model=list[PropietarioOut])
async def list_propietarios(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Propietario).where(Propietario.organizacion_id == org.id).order_by(Propietario.apellido)
    )
    return result.scalars().all()


@router.post("/", response_model=PropietarioOut, status_code=201)
async def create_propietario(
    data: PropietarioCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    prop = Propietario(**data.model_dump(), organizacion_id=org.id)
    db.add(prop)
    await db.flush()
    return prop
