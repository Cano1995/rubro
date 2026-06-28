from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import hash_password
from app.core.deps import get_current_user, get_current_org, require_roles
from app.models.usuario import Usuario, RolUsuario

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    rol: str
    activo: bool
    organizacion_id: int | None

    class Config:
        from_attributes = True


class UsuarioCreate(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    password: str
    rol: RolUsuario = RolUsuario.staff


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    activo: bool | None = None
    rol: RolUsuario | None = None


@router.get("/", response_model=list[UsuarioOut])
async def list_usuarios(
    current_user=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(Usuario.organizacion_id == org.id).order_by(Usuario.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=UsuarioOut, status_code=201)
async def create_usuario(
    data: UsuarioCreate,
    current_user=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "El email ya está registrado")

    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
        organizacion_id=org.id,
    )
    db.add(user)
    await db.flush()
    return user


@router.patch("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    current_user=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(Usuario.id == usuario_id, Usuario.organizacion_id == org.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.add(user)
    return user
