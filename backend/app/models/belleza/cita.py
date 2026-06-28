import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Enum, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class EstadoCitaBelleza(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    completada = "completada"
    cancelada = "cancelada"
    no_asistio = "no_asistio"


class CitaBelleza(Base):
    __tablename__ = "bel_citas"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("bel_clientes.id"), index=True)
    staff_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"))
    servicio_id: Mapped[int] = mapped_column(Integer, ForeignKey("bel_servicios.id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estado: Mapped[EstadoCitaBelleza] = mapped_column(Enum(EstadoCitaBelleza), default=EstadoCitaBelleza.pendiente)
    precio_cobrado: Mapped[float | None] = mapped_column(Numeric(10, 2))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cliente: Mapped["ClienteBelleza"] = relationship(back_populates="citas")
