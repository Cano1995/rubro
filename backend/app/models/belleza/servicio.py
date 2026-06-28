from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Servicio(Base):
    __tablename__ = "bel_servicios"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    duracion_minutos: Mapped[int] = mapped_column(Integer, default=30)
    precio: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
