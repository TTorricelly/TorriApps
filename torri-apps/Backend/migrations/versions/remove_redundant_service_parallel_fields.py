"""remove redundant service parallel processing fields

Revision ID: remove_redundant_parallel
Revises: add_service_config
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_redundant_parallel'
down_revision: Union[str, None] = 'add_service_config'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove redundant service-level parallel processing fields.
    
    These fields are redundant because parallel processing behavior is now
    handled at the service compatibility matrix level with more granular control.
    """
    
    # Remove redundant columns from services table
    op.drop_column('services', 'allows_parallel_during_processing')
    op.drop_column('services', 'can_be_done_during_processing')


def downgrade() -> None:
    """Add back redundant service-level parallel processing fields."""
    
    # Add back columns to services table
    op.add_column('services', sa.Column('allows_parallel_during_processing', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('services', sa.Column('can_be_done_during_processing', sa.Boolean(), nullable=False, server_default='false'))