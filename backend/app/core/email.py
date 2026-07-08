"""
Email helper usando Resend.
Si RESEND_API_KEY no está configurada, las llamadas retornan sin error (modo dev).
"""
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        logger.info(f"[EMAIL SIMULADO] To: {to} | Asunto: {subject}")
        return True
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Error enviando email a {to}: {e}")
        return False


def html_alerta_suscripcion(org_nombre: str, dias: int, plan: str, frontend_url: str, tipo: str = "suscripcion") -> str:
    es_perpetua = tipo == "perpetua"
    concepto = "mantenimiento anual" if es_perpetua else "suscripción"
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5">Rubro — Aviso de {concepto}</h2>
      <p>Hola, te avisamos que {'el' if es_perpetua else 'la'} {concepto} de <strong>{org_nombre}</strong>
      (plan <strong>{plan}</strong>) vencerá en <strong>{dias} días</strong>.</p>
      <p>Para renovar o cambiar de plan, ingresá a tu cuenta:</p>
      <a href="{frontend_url}/configuracion"
         style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin:12px 0">
        Renovar {concepto}
      </a>
      <p style="color:#888;font-size:12px">Si ya renovaste, podés ignorar este mensaje.</p>
    </div>
    """


def html_recordatorio_cita(
    paciente_o_cliente: str,
    fecha_hora: str,
    negocio: str,
    frontend_url: str,
) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5">Recordatorio de cita</h2>
      <p>Hola, te recordamos que tenés una cita agendada:</p>
      <div style="background:#f5f3ff;border-left:4px solid #6366f1;padding:16px;border-radius:8px;margin:12px 0">
        <p style="margin:0"><strong>{paciente_o_cliente}</strong></p>
        <p style="margin:4px 0 0;color:#555">{fecha_hora}</p>
        <p style="margin:4px 0 0;color:#555">{negocio}</p>
      </div>
      <p style="color:#888;font-size:12px">Este es un recordatorio automático de Rubro.</p>
    </div>
    """
