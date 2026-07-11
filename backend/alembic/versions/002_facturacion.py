"""Agrega tablas del módulo de facturación (fac_*)

Revision ID: 002_facturacion
Revises: 001_initial
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

revision = '002_facturacion'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # CREATE TYPE no soporta IF NOT EXISTS en Postgres — usamos un bloque DO
    # para que un reintento sobre una DB con objetos parcialmente creados
    # (ej. un deploy previo interrumpido) no falle con "type already exists".
    for enum_name, values in [
        ('tasaiva', ['IVA_10', 'IVA_5', 'EXENTO']),
        ('estadofactura', ['pendiente', 'pagada', 'cancelada', 'vencida']),
        ('condicionventa', ['contado', 'credito']),
    ]:
        labels = ", ".join(f"'{v}'" for v in values)
        bind.execute(sa.text(
            f"DO $$ BEGIN CREATE TYPE {enum_name} AS ENUM ({labels}); "
            f"EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
        ))

    if not insp.has_table('fac_config'):
        op.create_table('fac_config',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), unique=True, nullable=False),
            sa.Column('prefijo', sa.String(10), server_default='FAC', nullable=False),
            sa.Column('siguiente_numero', sa.Integer(), server_default='1', nullable=False),
            sa.Column('tasa_iva_default', PGEnum('IVA_10', 'IVA_5', 'EXENTO', name='tasaiva', create_type=False), server_default='IVA_10', nullable=False),
            sa.Column('precio_incluye_iva', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('ruc', sa.String(20), nullable=True),
            sa.Column('razon_social', sa.String(200), nullable=True),
            sa.Column('direccion_fiscal', sa.String(300), nullable=True),
            sa.Column('telefono_fiscal', sa.String(30), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if not insp.has_table('fac_clientes'):
        op.create_table('fac_clientes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), nullable=False, index=True),
            sa.Column('nombre', sa.String(200), nullable=False),
            sa.Column('ruc', sa.String(20), nullable=True),
            sa.Column('email', sa.String(200), nullable=True),
            sa.Column('telefono', sa.String(30), nullable=True),
            sa.Column('direccion', sa.String(300), nullable=True),
            sa.Column('activo', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if not insp.has_table('fac_facturas'):
        op.create_table('fac_facturas',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), nullable=False, index=True),
            sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('fac_clientes.id'), nullable=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False),
            sa.Column('numero', sa.String(30), nullable=False),
            sa.Column('fecha', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('fecha_vencimiento', sa.DateTime(timezone=True), nullable=True),
            sa.Column('condicion', PGEnum('contado', 'credito', name='condicionventa', create_type=False), server_default='contado', nullable=False),
            sa.Column('total_base', sa.Numeric(12, 2), server_default='0', nullable=False),
            sa.Column('total_iva10', sa.Numeric(12, 2), server_default='0', nullable=False),
            sa.Column('total_iva5', sa.Numeric(12, 2), server_default='0', nullable=False),
            sa.Column('total_exento', sa.Numeric(12, 2), server_default='0', nullable=False),
            sa.Column('total_general', sa.Numeric(12, 2), server_default='0', nullable=False),
            sa.Column('estado', PGEnum('pendiente', 'pagada', 'cancelada', 'vencida', name='estadofactura', create_type=False), server_default='pendiente', nullable=False),
            sa.Column('notas', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if not insp.has_table('fac_items'):
        op.create_table('fac_items',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('factura_id', sa.Integer(), sa.ForeignKey('fac_facturas.id'), nullable=False, index=True),
            sa.Column('descripcion', sa.String(300), nullable=False),
            sa.Column('cantidad', sa.Numeric(10, 2), nullable=False),
            sa.Column('precio_unitario', sa.Numeric(12, 2), nullable=False),
            sa.Column('tasa_iva', PGEnum('IVA_10', 'IVA_5', 'EXENTO', name='tasaiva', create_type=False), server_default='IVA_10', nullable=False),
            sa.Column('precio_incluye_iva', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
            sa.Column('monto_iva', sa.Numeric(12, 2), nullable=False),
            sa.Column('total', sa.Numeric(12, 2), nullable=False),
            sa.Column('orden', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if not insp.has_table('fac_pagos'):
        op.create_table('fac_pagos',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('factura_id', sa.Integer(), sa.ForeignKey('fac_facturas.id'), nullable=False, index=True),
            sa.Column('monto', sa.Numeric(12, 2), nullable=False),
            sa.Column('fecha', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('metodo_pago', sa.String(50), server_default='efectivo', nullable=False),
            sa.Column('referencia', sa.String(100), nullable=True),
            sa.Column('notas', sa.String(300), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('fac_pagos')
    op.drop_table('fac_items')
    op.drop_table('fac_facturas')
    op.drop_table('fac_clientes')
    op.drop_table('fac_config')

    sa.Enum(name='condicionventa').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='estadofactura').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='tasaiva').drop(op.get_bind(), checkfirst=True)
