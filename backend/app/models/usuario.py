import enum
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RolUsuario(str, enum.Enum):
    superadmin = "superadmin"
    org_admin = "org_admin"
    staff = "staff"
    cliente = "cliente"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(Enum(RolUsuario), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    organizacion_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("organizaciones.id"), index=True
    )
    reset_token_hash: Mapped[str | None] = mapped_column(String(64))
    reset_token_exp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    preferencias: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organizacion: Mapped["Organizacion"] = relationship(back_populates="usuarios")
