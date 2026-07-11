"""Agrega campos de factura electrónica SIFEN (elec-cano)

Revision ID: 005_factura_electronica
Revises: 004_fac_serie
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = '005_factura_electronica'
down_revision = '004_fac_serie'
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    cols_config = {c["name"] for c in insp.get_columns('fac_config')}
    cols_facturas = {c["name"] for c in insp.get_columns('fac_facturas')}

    # Conexión a elec-cano por organización
    if 'elec_url' not in cols_config:
        op.add_column('fac_config', sa.Column('elec_url', sa.String(500), nullable=True))
    if 'elec_api_key' not in cols_config:
        op.add_column('fac_config', sa.Column('elec_api_key', sa.String(200), nullable=True))

    # Resultado de la emisión electrónica por factura
    if 'cdc' not in cols_facturas:
        op.add_column('fac_facturas', sa.Column('cdc', sa.String(44), nullable=True))
    if 'qr_base64' not in cols_facturas:
        op.add_column('fac_facturas', sa.Column('qr_base64', sa.Text(), nullable=True))
    if 'estado_sifen' not in cols_facturas:
        op.add_column('fac_facturas', sa.Column('estado_sifen', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('fac_facturas', 'estado_sifen')
    op.drop_column('fac_facturas', 'qr_base64')
    op.drop_column('fac_facturas', 'cdc')
    op.drop_column('fac_config', 'elec_api_key')
    op.drop_column('fac_config', 'elec_url')
