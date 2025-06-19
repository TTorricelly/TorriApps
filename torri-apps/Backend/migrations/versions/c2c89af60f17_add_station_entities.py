"""add station entities

Revision ID: c2c89af60f17
Revises: 125efb993426
Create Date: 2025-06-19 13:42:23.476964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2c89af60f17'
down_revision: Union[str, None] = '125efb993426'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add station entities: StationType, Station, and ServiceStationRequirement."""
    
    # Create station_types table
    op.create_table(
        'station_types',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_station_types_code'), 'station_types', ['code'], unique=True)
    
    # Create stations table
    op.create_table(
        'stations',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('type_id', sa.CHAR(36), nullable=False),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['type_id'], ['station_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create service_station_requirements table
    op.create_table(
        'service_station_requirements',
        sa.Column('service_id', sa.CHAR(36), nullable=False),
        sa.Column('station_type_id', sa.CHAR(36), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.ForeignKeyConstraint(['station_type_id'], ['station_types.id'], ),
        sa.PrimaryKeyConstraint('service_id', 'station_type_id')
    )


def downgrade() -> None:
    """Remove station entities."""
    op.drop_table('service_station_requirements')
    op.drop_table('stations')
    op.drop_index(op.f('ix_station_types_code'), table_name='station_types')
    op.drop_table('station_types')
