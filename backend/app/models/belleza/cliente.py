from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ClienteBelleza(Base):
    __tablename__ = "bel_clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(200))
    notas: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    citas: Mapped[list["CitaBelleza"]] = relationship(back_populates="cliente")
