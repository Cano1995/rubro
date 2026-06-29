"""Agrega campo serie a fac_config para overflow e-kuatia (9999999+)

Revision ID: 004_fac_serie
Revises: 003_fac_timbrado
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = '004_fac_serie'
down_revision = '003_fac_timbrado'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Serie alfanumérica de 2 chars (NULL = sin serie, activo desde 9999999+1)
    op.add_column('fac_config', sa.Column('serie', sa.String(2), nullable=True))


def downgrade() -> None:
    op.drop_column('fac_config', 'serie')
