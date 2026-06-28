import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class EstadoCita(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    en_curso = "en_curso"
    completada = "completada"
    cancelada = "cancelada"


class CitaVet(Base):
    __tablename__ = "vet_citas"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(Integer, ForeignKey("vet_pacientes.id"), index=True)
    veterinario_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    motivo: Mapped[str] = mapped_column(String(300), nullable=False)
    estado: Mapped[EstadoCita] = mapped_column(Enum(EstadoCita), default=EstadoCita.pendiente)
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    paciente: Mapped["Paciente"] = relationship(back_populates="citas")
