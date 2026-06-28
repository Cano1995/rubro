from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.deps import get_current_org, require_roles, require_rubro
from app.core.security import hash_password
from app.models.usuario import Usuario, RolUsuario

router = APIRouter(prefix="/belleza/staff", tags=["belleza"])

_require = require_rubro("belleza")


class StaffOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    activo: bool

    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    password: str


class StaffUpdate(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    activo: bool | None = None


@router.get("/", response_model=list[StaffOut])
async def list_staff(
    _=Depends(_require),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(
            Usuario.organizacion_id == org.id,
            Usuario.rol == RolUsuario.staff,
        ).order_by(Usuario.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=StaffOut, status_code=201)
async def create_staff(
    data: StaffCreate,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "El email ya está registrado")

    staff = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=RolUsuario.staff,
        organizacion_id=org.id,
    )
    db.add(staff)
    await db.flush()
    return staff


@router.patch("/{staff_id}", response_model=StaffOut)
async def update_staff(
    staff_id: int,
    data: StaffUpdate,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(
            Usuario.id == staff_id,
            Usuario.organizacion_id == org.id,
            Usuario.rol == RolUsuario.staff,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(404, "Staff no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(staff, k, v)
    db.add(staff)
    return staff


@router.delete("/{staff_id}", status_code=204)
async def delete_staff(
    staff_id: int,
    _=Depends(require_roles("org_admin", "superadmin")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(
            Usuario.id == staff_id,
            Usuario.organizacion_id == org.id,
            Usuario.rol == RolUsuario.staff,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(404)
    staff.activo = False
    db.add(staff)
