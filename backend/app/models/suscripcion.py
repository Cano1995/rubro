import enum
from datetime import datetime
from sqlalchemy import String, Enum, ForeignKey, DateTime, func, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class EstadoSuscripcion(str, enum.Enum):
    activa = "activa"
    vencida = "vencida"
    cancelada = "cancelada"
    prueba = "prueba"


class TipoLicencia(str, enum.Enum):
    suscripcion = "suscripcion"
    perpetua = "perpetua"


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    tipo: Mapped[TipoLicencia] = mapped_column(Enum(TipoLicencia), default=TipoLicencia.suscripcion, server_default=TipoLicencia.suscripcion.value)
    plan: Mapped[str] = mapped_column(String(50), nullable=False)
    estado: Mapped[EstadoSuscripcion] = mapped_column(Enum(EstadoSuscripcion), default=EstadoSuscripcion.prueba)
    monto_mensual: Mapped[float | None] = mapped_column(Numeric(10, 2))
    # Licencia perpetua: pago único + mantenimiento/hosting anual opcional (cubre costo de infra en un SaaS multi-tenant)
    monto_pago_unico: Mapped[float | None] = mapped_column(Numeric(10, 2))
    monto_mantenimiento_anual: Mapped[float | None] = mapped_column(Numeric(10, 2))
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # None = no vence. Para suscripcion: próxima facturación. Para perpetua: próximo mantenimiento (si aplica).
    fecha_vencimiento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    referencia_pago: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organizacion: Mapped["Organizacion"] = relationship(back_populates="suscripciones")
