import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Integer, Numeric, Enum, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class TasaIVA(str, enum.Enum):
    IVA_10 = "IVA_10"
    IVA_5 = "IVA_5"
    EXENTO = "EXENTO"


class EstadoFactura(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADA = "pagada"
    CANCELADA = "cancelada"
    VENCIDA = "vencida"


class CondicionVenta(str, enum.Enum):
    CONTADO = "contado"
    CREDITO = "credito"


class FacConfig(Base):
    """Configuración de facturación por organización (1:1)."""
    __tablename__ = "fac_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), unique=True)

    # Numeración paraguaya: XXX-YYY-NNNNNNN
    codigo_establecimiento: Mapped[str] = mapped_column(String(3), default="001")
    punto_expedicion: Mapped[str] = mapped_column(String(3), default="001")
    siguiente_numero: Mapped[int] = mapped_column(Integer, default=1)

    # Timbrado SET (autorización de emisión)
    timbrado: Mapped[str | None] = mapped_column(String(20))
    timbrado_vigencia_desde: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timbrado_vigencia_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tasa_iva_default: Mapped[TasaIVA] = mapped_column(Enum(TasaIVA), default=TasaIVA.IVA_10)
    precio_incluye_iva: Mapped[bool] = mapped_column(Boolean, default=True)

    # Datos del emisor
    ruc: Mapped[str | None] = mapped_column(String(20))
    razon_social: Mapped[str | None] = mapped_column(String(200))
    direccion_fiscal: Mapped[str | None] = mapped_column(String(300))
    telefono_fiscal: Mapped[str | None] = mapped_column(String(30))

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class FacCliente(Base):
    __tablename__ = "fac_clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(200))
    telefono: Mapped[str | None] = mapped_column(String(30))
    direccion: Mapped[str | None] = mapped_column(String(300))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    facturas: Mapped[list["Factura"]] = relationship(back_populates="cliente")


class Factura(Base):
    __tablename__ = "fac_facturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizaciones.id"), index=True)
    cliente_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fac_clientes.id"))
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"))

    numero: Mapped[str] = mapped_column(String(30), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    fecha_vencimiento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    condicion: Mapped[CondicionVenta] = mapped_column(Enum(CondicionVenta), default=CondicionVenta.CONTADO)

    total_base: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_iva10: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_iva5: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_exento: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_general: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    estado: Mapped[EstadoFactura] = mapped_column(Enum(EstadoFactura), default=EstadoFactura.PENDIENTE)
    notas: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    cliente: Mapped["FacCliente | None"] = relationship(back_populates="facturas", lazy="selectin")
    items: Mapped[list["FacturaItem"]] = relationship(
        back_populates="factura", cascade="all, delete-orphan", lazy="selectin", order_by="FacturaItem.orden"
    )
    pagos: Mapped[list["FacturaPago"]] = relationship(
        back_populates="factura", cascade="all, delete-orphan", lazy="selectin"
    )


class FacturaItem(Base):
    __tablename__ = "fac_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    factura_id: Mapped[int] = mapped_column(Integer, ForeignKey("fac_facturas.id"), index=True)
    descripcion: Mapped[str] = mapped_column(String(300), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tasa_iva: Mapped[TasaIVA] = mapped_column(Enum(TasaIVA), default=TasaIVA.IVA_10)
    precio_incluye_iva: Mapped[bool] = mapped_column(Boolean, default=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    monto_iva: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    factura: Mapped["Factura"] = relationship(back_populates="items")


class FacturaPago(Base):
    __tablename__ = "fac_pagos"

    id: Mapped[int] = mapped_column(primary_key=True)
    factura_id: Mapped[int] = mapped_column(Integer, ForeignKey("fac_facturas.id"), index=True)
    monto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metodo_pago: Mapped[str] = mapped_column(String(50), default="efectivo")
    referencia: Mapped[str | None] = mapped_column(String(100))
    notas: Mapped[str | None] = mapped_column(String(300))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    factura: Mapped["Factura"] = relationship(back_populates="pagos")
