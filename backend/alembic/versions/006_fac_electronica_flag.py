"""Agrega flag factura_electronica_activa a fac_config

Revision ID: 006_fac_electronica_flag
Revises: 005_factura_electronica
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = '006_fac_electronica_flag'
down_revision = '005_factura_electronica'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('fac_config', sa.Column('factura_electronica_activa', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('fac_config', 'factura_electronica_activa')
