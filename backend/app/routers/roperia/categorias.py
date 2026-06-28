from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro
from app.models.roperia.categoria import Categoria

router = APIRouter(prefix="/roperia/categorias", tags=["roperia"])

_require = require_rubro("roperia")


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None

    class Config:
        from_attributes = True


class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


@router.get("/", response_model=list[CategoriaOut])
async def list_categorias(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Categoria).where(Categoria.organizacion_id == org.id).order_by(Categoria.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=CategoriaOut, status_code=201)
async def create_categoria(
    data: CategoriaCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cat = Categoria(**data.model_dump(), organizacion_id=org.id)
    db.add(cat)
    await db.flush()
    return cat


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


@router.patch("/{categoria_id}", response_model=CategoriaOut)
async def update_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Categoria).where(Categoria.id == categoria_id, Categoria.organizacion_id == org.id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.flush()
    return cat
