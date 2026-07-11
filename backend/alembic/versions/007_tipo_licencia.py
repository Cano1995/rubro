"""Agrega tipo de licencia (suscripcion / perpetua) a suscripciones

Revision ID: 007_tipo_licencia
Revises: 006_fac_electronica_flag
Create Date: 2026-07-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

revision = '007_tipo_licencia'
down_revision = '006_fac_electronica_flag'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # postgresql.ENUM (no sa.Enum genérico) es necesario para que create_type=False
    # se respete de verdad dentro de op.add_column — ver 002_facturacion.py.
    bind.execute(sa.text(
        "DO $$ BEGIN CREATE TYPE tipolicencia AS ENUM ('suscripcion', 'perpetua'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    ))

    existentes = {c["name"] for c in insp.get_columns('suscripciones')}
    if 'tipo' not in existentes:
        op.add_column('suscripciones', sa.Column(
            'tipo', PGEnum('suscripcion', 'perpetua', name='tipolicencia', create_type=False),
            server_default='suscripcion', nullable=False,
        ))
    if 'monto_pago_unico' not in existentes:
        op.add_column('suscripciones', sa.Column('monto_pago_unico', sa.Numeric(10, 2), nullable=True))
    if 'monto_mantenimiento_anual' not in existentes:
        op.add_column('suscripciones', sa.Column('monto_mantenimiento_anual', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('suscripciones', 'monto_mantenimiento_anual')
    op.drop_column('suscripciones', 'monto_pago_unico')
    op.drop_column('suscripciones', 'tipo')
    sa.Enum(name='tipolicencia').drop(op.get_bind(), checkfirst=True)