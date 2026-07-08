from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.usuario import Usuario

    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
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


async def require_superadmin_or_cron(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Permite invocar el endpoint a un cron externo (header X-Cron-Secret == settings.CRON_SECRET)
    o a un superadmin logueado por JWT. Si CRON_SECRET no está configurado, el header se ignora.
    """
    from app.core.config import settings

    if settings.CRON_SECRET and x_cron_secret == settings.CRON_SECRET:
        return None

    current_user = await get_current_user(credentials, db)
    if current_user.rol != "superadmin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return current_user


async def _licencia_vigente(org, db: AsyncSession) -> bool:
    """
    True si la organización puede seguir operando: sin vencimiento registrado
    (perpetua sin mantenimiento), o dentro del vencimiento + días de gracia.
    """
    from app.models.suscripcion import Suscripcion
    from app.core.config import settings

    result = await db.execute(
        select(Suscripcion)
        .where(Suscripcion.organizacion_id == org.id)
        .order_by(Suscripcion.created_at.desc())
        .limit(1)
    )
    sus = result.scalar_one_or_none()
    if sus is None or sus.fecha_vencimiento is None:
        return True

    from datetime import datetime, timedelta, timezone

    vencimiento = sus.fecha_vencimiento
    if vencimiento.tzinfo is None:
        vencimiento = vencimiento.replace(tzinfo=timezone.utc)
    limite = vencimiento + timedelta(days=settings.DIAS_GRACIA_VENCIMIENTO)
    return datetime.now(timezone.utc) <= limite


def require_rubro(*rubros: str):
    """Verifica que la organización del usuario sea del rubro requerido y tenga licencia vigente."""
    async def _check(
        current_user=Depends(get_current_user),
        org=Depends(get_current_org),
        db: AsyncSession = Depends(get_db),
    ):
        if current_user.rol == "superadmin":
            return current_user
        if org.rubro not in rubros:
            raise HTTPException(
                status_code=403,
                detail=f"Módulo no disponible para el rubro '{org.rubro}'",
            )
        if not await _licencia_vigente(org, db):
            raise HTTPException(
                status_code=402,
                detail="Tu licencia está vencida. Renová para seguir usando el sistema.",
            )
        return current_user
    return _check
