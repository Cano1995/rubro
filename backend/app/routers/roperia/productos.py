from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro, require_roles
from app.models.roperia.producto import Producto

router = APIRouter(prefix="/roperia/productos", tags=["roperia"])

_require = require_rubro("roperia")


class ProductoOut(BaseModel):
    id: int
    codigo: str | None
    nombre: str
    descripcion: str | None
    precio_venta: float
    precio_costo: float | None
    stock: int
    stock_minimo: int
    variantes: dict
    foto_url: str | None
    activo: bool
    categoria_id: int | None

    class Config:
        from_attributes = True


class ProductoCreate(BaseModel):
    categoria_id: int | None = None
    codigo: str | None = None
    nombre: str
    descripcion: str | None = None
    precio_venta: float
    precio_costo: float | None = None
    stock: int = 0
    stock_minimo: int = 0
    variantes: dict = {}
    foto_url: str | None = None


class ProductoUpdate(BaseModel):
    nombre: str | None = None
    precio_venta: float | None = None
    precio_costo: float | None = None
    stock: int | None = None
    stock_minimo: int | None = None
    variantes: dict | None = None
    activo: bool | None = None


@router.get("/", response_model=list[ProductoOut])
async def list_productos(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Producto).where(Producto.organizacion_id == org.id, Producto.activo == True)
        .order_by(Producto.nombre)
    )
    return result.scalars().all()


@router.get("/bajo-stock", response_model=list[ProductoOut])
async def bajo_stock(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Producto).where(
            Producto.organizacion_id == org.id,
            Producto.stock <= Producto.stock_minimo,
            Producto.activo == True,
        )
    )
    return result.scalars().all()


@router.post("/", response_model=ProductoOut, status_code=201)
async def create_producto(
    data: ProductoCreate,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    producto = Producto(**data.model_dump(), organizacion_id=org.id)
    db.add(producto)
    await db.flush()
    return producto


@router.patch("/{producto_id}", response_model=ProductoOut)
async def update_producto(
    producto_id: int,
    data: ProductoUpdate,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Producto).where(Producto.id == producto_id, Producto.organizacion_id == org.id)
    )
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(producto, k, v)
    db.add(producto)
    return producto
