"""
Notificaciones: recordatorios de citas por email.
Endpoints invocables manualmente o por cron externo.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.deps import get_current_org, require_rubro
from app.core.email import send_email, html_recordatorio_cita
from app.models.organizacion import Organizacion

# Veterinaria
from app.models.veterinaria.cita import CitaVet, EstadoCita
from app.models.veterinaria.paciente import Paciente
from app.models.veterinaria.propietario import Propietario

# Belleza
from app.models.belleza.cita import CitaBelleza, EstadoCitaBelleza
from app.models.belleza.cliente import ClienteBelleza

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


@router.post("/recordatorios-veterinaria")
async def recordatorios_veterinaria(
    background: BackgroundTasks,
    _=Depends(require_rubro("veterinaria")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Envía recordatorios por email a propietarios con citas en las próximas 24h.
    Solo citas pendientes o confirmadas que tengan propietario con email.
    """
    ahora = datetime.now(tz=timezone.utc)
    en_24h = ahora + timedelta(hours=24)

    citas_res = await db.execute(
        select(CitaVet)
        .where(
            CitaVet.organizacion_id == org.id,
            CitaVet.fecha_hora.between(ahora, en_24h),
            CitaVet.estado.in_([EstadoCita.pendiente.value, EstadoCita.confirmada.value]),
        )
    )
    citas = citas_res.scalars().all()

    enviados = 0
    for cita in citas:
        paciente = await db.get(Paciente, cita.paciente_id)
        if not paciente:
            continue
        propietario = await db.get(Propietario, paciente.propietario_id)
        if not propietario or not propietario.email:
            continue

        fecha_fmt = cita.fecha_hora.strftime("%d/%m/%Y a las %H:%M")
        html = html_recordatorio_cita(
            paciente_o_cliente=f"{paciente.nombre} ({paciente.especie})",
            fecha_hora=fecha_fmt,
            negocio=org.nombre,
            frontend_url="https://rubro.app",
        )
        background.add_task(
            send_email,
            propietario.email,
            f"Recordatorio de cita para {paciente.nombre} — {org.nombre}",
            html,
        )
        enviados += 1

    return {"mensaje": f"Recordatorios encolados: {enviados}"}


@router.post("/recordatorios-belleza")
async def recordatorios_belleza(
    background: BackgroundTasks,
    _=Depends(require_rubro("belleza")),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Envía recordatorios por email a clientes con citas en las próximas 24h.
    """
    ahora = datetime.now(tz=timezone.utc)
    en_24h = ahora + timedelta(hours=24)

    citas_res = await db.execute(
        select(CitaBelleza)
        .where(
            CitaBelleza.organizacion_id == org.id,
            CitaBelleza.fecha_hora.between(ahora, en_24h),
            CitaBelleza.estado.in_([EstadoCitaBelleza.pendiente.value, EstadoCitaBelleza.confirmada.value]),
        )
    )
    citas = citas_res.scalars().all()

    enviados = 0
    for cita in citas:
        cliente = await db.get(ClienteBelleza, cita.cliente_id)
        if not cliente or not cliente.email:
            continue

        fecha_fmt = cita.fecha_hora.strftime("%d/%m/%Y a las %H:%M")
        html = html_recordatorio_cita(
            paciente_o_cliente=f"{cliente.nombre} {cliente.apellido}",
            fecha_hora=fecha_fmt,
            negocio=org.nombre,
            frontend_url="https://rubro.app",
        )
        background.add_task(
            send_email,
            cliente.email,
            f"Recordatorio de cita — {org.nombre}",
            html,
        )
        enviados += 1

    return {"mensaje": f"Recordatorios encolados: {enviados}"}
