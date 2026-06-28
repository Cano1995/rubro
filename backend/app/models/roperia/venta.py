import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Numeric, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    tarjeta = "tarjeta"
    transferencia = "transferencia"
    credito = "credito"


class EstadoVenta(str, enum.Enum):
    completada = "completada"
    anulada = "anulada"
    pendiente = "pendiente"


class Venta(Base):
    __tablename__ = "rop_ventas"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    cajero_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"))
    numero_factura: Mapped[str | None] = mapped_column(String(50))
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    descuento: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    metodo_pago: Mapped[MetodoPago] = mapped_column(Enum(MetodoPago), default=MetodoPago.efectivo)
    estado: Mapped[EstadoVenta] = mapped_column(Enum(EstadoVenta), default=EstadoVenta.completada)
    cliente_nombre: Mapped[str | None] = mapped_column(String(200))
    notas: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["ItemVenta"]] = relationship(back_populates="venta", cascade="all, delete-orphan")


class ItemVenta(Base):
    __tablename__ = "rop_items_venta"

    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(Integer, ForeignKey("rop_ventas.id"), index=True)
    producto_id: Mapped[int] = mapped_column(Integer, ForeignKey("rop_productos.id"))
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    variante: Mapped[dict] = mapped_column(JSON, default=dict)  # talla, color seleccionado

    venta: Mapped["Venta"] = relationship(back_populates="items")
