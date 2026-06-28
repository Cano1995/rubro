from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.deps import get_current_org, require_superadmin
from app.models.suscripcion import Suscripcion, EstadoSuscripcion
from app.models.organizacion import Organizacion
from app.models.usuario import Usuario, RolUsuario
from app.core.email import send_email, html_alerta_suscripcion

router = APIRouter(prefix="/suscripciones", tags=["suscripciones"])


class SuscripcionOut(BaseModel):
    id: int
    plan: str
    estado: str
    monto_mensual: float | None
    fecha_inicio: datetime
    fecha_vencimiento: datetime | None

    class Config:
        from_attributes = True


@router.get("/mi-suscripcion", response_model=list[SuscripcionOut])
async def get_mi_suscripcion(
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Suscripcion)
        .where(Suscripcion.organizacion_id == org.id)
        .order_by(Suscripcion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/enviar-alertas-vencimiento")
async def enviar_alertas_vencimiento(
    background: BackgroundTasks,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Superadmin: envía emails a org_admins cuya suscripción vence en ≤7 días.
    Se ejecuta en background para no bloquear la respuesta.
    """
    desde_now = datetime.now(tz=timezone.utc)
    umbral = desde_now + timedelta(days=7)

    subs_res = await db.execute(
        select(Suscripcion)
        .where(
            Suscripcion.fecha_vencimiento <= umbral,
            Suscripcion.fecha_vencimiento >= desde_now,
            Suscripcion.estado.in_(["activa", "prueba"]),
        )
    )
    suscripciones = subs_res.scalars().all()

    enviados = 0
    for sub in suscripciones:
        org = await db.get(Organizacion, sub.organizacion_id)
        if not org or not org.activo:
            continue
        admin_res = await db.execute(
            select(Usuario)
            .where(
                Usuario.organizacion_id == org.id,
                Usuario.rol == RolUsuario.org_admin,
                Usuario.activo == True,
            )
        )
        admin = admin_res.scalar_one_or_none()
        if not admin:
            continue

        dias = (sub.fecha_vencimiento.replace(tzinfo=timezone.utc) - desde_now).days
        html = html_alerta_suscripcion(
            org_nombre=org.nombre,
            dias=dias,
            plan=sub.plan,
            frontend_url="https://rubro.app",
        )
        background.add_task(send_email, admin.email, f"Tu suscripción vence en {dias} días — Rubro", html)
        enviados += 1

    return {"mensaje": f"Alertas encoladas para {enviados} organización(es)"}
