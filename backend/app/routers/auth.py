from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models.usuario import Usuario, RolUsuario

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    rol: str
    organizacion_id: int | None

    class Config:
        from_attributes = True


class RegisterIn(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    password: str
    org_nombre: str
    rubro: str          # veterinaria | belleza | roperia
    org_ruc: str | None = None


@router.post("/login", response_model=LoginResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    extra = {"rol": user.rol, "org_id": user.organizacion_id}
    return LoginResponse(
        access_token=create_access_token(user.id, extra=extra),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    from app.models.organizacion import Organizacion, RubroNegocio, PlanOrg, EstadoOrg

    # Validar rubro
    try:
        rubro = RubroNegocio(data.rubro)
    except ValueError:
        raise HTTPException(400, f"Rubro inválido. Opciones: {[r.value for r in RubroNegocio]}")

    # Verificar email único
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "El email ya está registrado")

    # Crear organización
    org = Organizacion(
        nombre=data.org_nombre,
        ruc=data.org_ruc,
        rubro=rubro,
        plan=PlanOrg.free,
        estado=EstadoOrg.prueba,
    )
    db.add(org)
    await db.flush()

    # Crear usuario org_admin
    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=RolUsuario.org_admin,
        organizacion_id=org.id,
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=LoginResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("No es un refresh token")
        user_id = int(payload["sub"])
    except ValueError as e:
        raise HTTPException(401, str(e))

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.activo:
        raise HTTPException(401, "Usuario no encontrado")

    extra = {"rol": user.rol, "org_id": user.organizacion_id}
    return LoginResponse(
        access_token=create_access_token(user.id, extra=extra),
        refresh_token=create_refresh_token(user.id),
    )
