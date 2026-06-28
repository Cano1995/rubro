from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Numeric, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Producto(Base):
    __tablename__ = "rop_productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    categoria_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("rop_categorias.id"))
    codigo: Mapped[str | None] = mapped_column(String(50), index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    precio_venta: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    precio_costo: Mapped[float | None] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=0)
    # tallas y colores como JSON para flexibilidad
    variantes: Mapped[dict] = mapped_column(JSON, default=dict)
    foto_url: Mapped[str | None] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    categoria: Mapped["Categoria"] = relationship(back_populates="productos")
