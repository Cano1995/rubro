import enum
from datetime import datetime, date
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Enum, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Sexo(str, enum.Enum):
    macho = "macho"
    hembra = "hembra"
    desconocido = "desconocido"


class Paciente(Base):
    __tablename__ = "vet_pacientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    propietario_id: Mapped[int] = mapped_column(Integer, ForeignKey("vet_propietarios.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    especie: Mapped[str] = mapped_column(String(50), nullable=False)   # perro, gato, etc.
    raza: Mapped[str | None] = mapped_column(String(100))
    color: Mapped[str | None] = mapped_column(String(50))
    sexo: Mapped[Sexo] = mapped_column(Enum(Sexo), default=Sexo.desconocido)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    esterilizado: Mapped[bool] = mapped_column(default=False)
    foto_url: Mapped[str | None] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    propietario: Mapped["Propietario"] = relationship(back_populates="pacientes")
    citas: Mapped[list["CitaVet"]] = relationship(back_populates="paciente")
    historiales: Mapped[list["HistorialMedico"]] = relationship(back_populates="paciente")
    vacunas: Mapped[list["Vacuna"]] = relationship(back_populates="paciente")
