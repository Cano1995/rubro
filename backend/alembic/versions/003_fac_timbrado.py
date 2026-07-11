"""Agrega campos de timbrado paraguayo (SET) a fac_config

Revision ID: 003_fac_timbrado
Revises: 002_facturacion
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = '003_fac_timbrado'
down_revision = '002_facturacion'
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    existentes = {c["name"] for c in insp.get_columns('fac_config')}

    # Numeración paraguaya XXX-YYY-NNNNNNN (reemplaza prefijo)
    if 'codigo_establecimiento' not in existentes:
        op.add_column('fac_config', sa.Column('codigo_establecimiento', sa.String(3), server_default='001', nullable=False))
    if 'punto_expedicion' not in existentes:
        op.add_column('fac_config', sa.Column('punto_expedicion', sa.String(3), server_default='001', nullable=False))

    # Timbrado SET
    if 'timbrado' not in existentes:
        op.add_column('fac_config', sa.Column('timbrado', sa.String(20), nullable=True))
    if 'timbrado_vigencia_desde' not in existentes:
        op.add_column('fac_config', sa.Column('timbrado_vigencia_desde', sa.DateTime(timezone=True), nullable=True))
    if 'timbrado_vigencia_hasta' not in existentes:
        op.add_column('fac_config', sa.Column('timbrado_vigencia_hasta', sa.DateTime(timezone=True), nullable=True))

    # El campo prefijo queda deprecated pero se mantiene para no romper columnas existentes
    # Se puede eliminar en una migración futura cuando todas las DBs hayan migrado


def downgrade() -> None:
    op.drop_column('fac_config', 'timbrado_vigencia_hasta')
    op.drop_column('fac_config', 'timbrado_vigencia_desde')
    op.drop_column('fac_config', 'timbrado')
    op.drop_column('fac_config', 'punto_expedicion')
    op.drop_column('fac_config', 'codigo_establecimiento')
