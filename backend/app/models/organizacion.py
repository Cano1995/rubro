import enum
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RubroNegocio(str, enum.Enum):
    """
    Enum extensible de rubros de negocio.
    Para agregar un nuevo rubro:
      1. Añadir la entrada aquí.
      2. Crear la carpeta app/models/<rubro>/ con sus modelos.
      3. Crear la carpeta app/routers/<rubro>/ con sus endpoints.
      4. Registrar el router en main.py.
      5. Crear la carpeta frontend/src/pages/<rubro>/ con sus vistas.
    """
    veterinaria = "veterinaria"
    belleza = "belleza"
    roperia = "roperia"
    # pos = "pos"        # ← ejemplo de futuro rubro (descomentar y seguir los pasos)


class PlanOrg(str, enum.Enum):
    free = "free"
    basico = "basico"
    pro = "pro"


class EstadoOrg(str, enum.Enum):
    activa = "activa"
    suspendida = "suspendida"
    prueba = "prueba"


class Organizacion(Base):
    __tablename__ = "organizaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(20), unique=True)
    rubro: Mapped[RubroNegocio] = mapped_column(Enum(RubroNegocio), nullable=False)
    plan: Mapped[PlanOrg] = mapped_column(Enum(PlanOrg), default=PlanOrg.free)
    estado: Mapped[EstadoOrg] = mapped_column(Enum(EstadoOrg), default=EstadoOrg.prueba)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    # JSON libre para configuración específica del rubro (horarios, moneda, etc.)
    configuracion: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="organizacion")
    suscripciones: Mapped[list["Suscripcion"]] = relationship(back_populates="organizacion")
