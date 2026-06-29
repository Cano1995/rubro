from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_org
from app.models.facturacion.models import FacCliente

router = APIRouter(prefix="/facturacion/clientes", tags=["facturacion"])


class ClienteOut(BaseModel):
    id: int
    nombre: str
    ruc: str | None
    email: str | None
    telefono: str | None
    direccion: str | None
    activo: bool

    class Config:
        from_attributes = True


class ClienteCreate(BaseModel):
    nombre: str
    ruc: str | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None


class ClienteUpdate(BaseModel):
    nombre: str | None = None
    ruc: str | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    activo: bool | None = None


@router.get("/", response_model=list[ClienteOut])
async def list_clientes(
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FacCliente)
        .where(FacCliente.organizacion_id == org.id, FacCliente.activo == True)
        .order_by(FacCliente.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=ClienteOut, status_code=201)
async def create_cliente(
    data: ClienteCreate,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cliente = FacCliente(**data.model_dump(), organizacion_id=org.id)
    db.add(cliente)
    await db.flush()
    return cliente


@router.get("/{cliente_id}", response_model=ClienteOut)
async def get_cliente(
    cliente_id: int,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FacCliente).where(FacCliente.id == cliente_id, FacCliente.organizacion_id == org.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    return c


@router.patch("/{cliente_id}", response_model=ClienteOut)
async def update_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FacCliente).where(FacCliente.id == cliente_id, FacCliente.organizacion_id == org.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    return c


@router.delete("/{cliente_id}", status_code=204)
async def delete_cliente(
    cliente_id: int,
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FacCliente).where(FacCliente.id == cliente_id, FacCliente.organizacion_id == org.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404)
    c.activo = False
