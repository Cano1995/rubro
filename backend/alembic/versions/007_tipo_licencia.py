"""Agrega tipo de licencia (suscripcion / perpetua) a suscripciones

Revision ID: 007_tipo_licencia
Revises: 006_fac_electronica_flag
Create Date: 2026-07-08
"""
from alembic import op
import sqlalchemy as sa

revision = '007_tipo_licencia'
down_revision = '006_fac_electronica_flag'
branch_labels = None
depends_on = None


def upgrade() -> None:
    tipolicencia = sa.Enum('suscripcion', 'perpetua', name='tipolicencia')
    tipolicencia.create(op.get_bind(), checkfirst=True)

    op.add_column('suscripciones', sa.Column('tipo', tipolicencia, server_default='suscripcion', nullable=False))
    op.add_column('suscripciones', sa.Column('monto_pago_unico', sa.Numeric(10, 2), nullable=True))
    op.add_column('suscripciones', sa.Column('monto_mantenimiento_anual', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('suscripciones', 'monto_mantenimiento_anual')
    op.drop_column('suscripciones', 'monto_pago_unico')
    op.drop_column('suscripciones', 'tipo')
    sa.Enum(name='tipolicencia').drop(op.get_bind(), checkfirst=True)