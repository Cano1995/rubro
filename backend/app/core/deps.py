from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.usuario import Usuario

    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise exc
    except ValueError:
        raise exc

    result = await db.execute(select(Usuario).where(Usuario.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.activo:
        raise exc
    return user


async def get_current_org(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.organizacion import Organizacion

    if current_user.organizacion_id is None:
        raise HTTPException(403, "Usuario sin organización asignada")

    result = await db.execute(
        select(Organizacion).where(Organizacion.id == current_user.organizacion_id)
    )
    org = result.scalar_one_or_none()
    if org is None or not org.activo:
        raise HTTPException(403, "Organización inactiva o no encontrada")
    return org


def require_roles(*roles: str):
    async def _check(current_user=Depends(get_current_user)):
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Roles permitidos: {', '.join(roles)}",
            )
        return current_user
    return _check


def require_superadmin(current_user=Depends(get_current_user)):
    if current_user.rol != "superadmin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return current_user


def require_rubro(*rubros: str):
    """Verifica que la organización del usuario sea del rubro requerido."""
    async def _check(
        current_user=Depends(get_current_user),
        org=Depends(get_current_org),
    ):
        if current_user.rol == "superadmin":
            return current_user
        if org.rubro not in rubros:
            raise HTTPException(
                status_code=403,
                detail=f"Módulo no disponible para el rubro '{org.rubro}'",
            )
        return current_user
    return _check
