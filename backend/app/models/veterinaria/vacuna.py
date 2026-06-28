from datetime import datetime, date
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Vacuna(Base):
    __tablename__ = "vet_vacunas"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(Integer, ForeignKey("vet_pacientes.id"), index=True)
    nombre_vacuna: Mapped[str] = mapped_column(String(200), nullable=False)
    lote: Mapped[str | None] = mapped_column(String(100))
    fecha_aplicacion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    veterinario_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"))
    recordatorio_enviado: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    paciente: Mapped["Paciente"] = relationship(back_populates="vacunas")
