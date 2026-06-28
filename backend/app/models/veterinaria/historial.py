from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HistorialMedico(Base):
    __tablename__ = "vet_historiales"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(Integer, ForeignKey("vet_pacientes.id"), index=True)
    veterinario_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    motivo_consulta: Mapped[str] = mapped_column(String(300), nullable=False)
    diagnostico: Mapped[str | None] = mapped_column(Text)
    tratamiento: Mapped[str | None] = mapped_column(Text)
    medicamentos: Mapped[str | None] = mapped_column(Text)
    peso_kg: Mapped[float | None] = mapped_column(Numeric(6, 2))
    temperatura: Mapped[float | None] = mapped_column(Numeric(4, 1))
    proxima_cita: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    paciente: Mapped["Paciente"] = relationship(back_populates="historiales")
