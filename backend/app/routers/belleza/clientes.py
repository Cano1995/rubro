from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro
from app.models.belleza.cliente import ClienteBelleza

router = APIRouter(prefix="/belleza/clientes", tags=["belleza"])

_require = require_rubro("belleza")


class ClienteOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    telefono: str | None
    email: str | None
    notas: str | None
    activo: bool

    class Config:
        from_attributes = True


class ClienteCreate(BaseModel):
    nombre: str
    apellido: str
    telefono: str | None = None
    email: EmailStr | None = None
    notas: str | None = None


@router.get("/", response_model=list[ClienteOut])
async def list_clientes(
    _=Depends(_require), org=Depends(get_current_org), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ClienteBelleza).where(ClienteBelleza.organizacion_id == org.id, ClienteBelleza.activo == True)
        .order_by(ClienteBelleza.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=ClienteOut, status_code=201)
async def create_cliente(
    data: ClienteCreate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    cliente = ClienteBelleza(**data.model_dump(), organizacion_id=org.id)
    db.add(cliente)
    await db.flush()
    return cliente


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    notas: Optional[str] = None


@router.patch("/{cliente_id}", response_model=ClienteOut)
async def update_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ClienteBelleza).where(ClienteBelleza.id == cliente_id, ClienteBelleza.organizacion_id == org.id)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    db.add(cliente)
    return cliente
