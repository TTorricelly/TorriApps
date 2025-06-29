"""add parallel service fields

Revision ID: abc123def456
Revises: fba7ad9ac356
Create Date: 2025-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123def456'
down_revision: Union[str, None] = 'fba7ad9ac356'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parallelable and max_parallel_pros fields to services table."""
    # Add the new fields to the services table
    op.add_column('services', sa.Column('parallelable', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('services', sa.Column('max_parallel_pros', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    """Remove parallelable and max_parallel_pros fields from services table."""
    # Remove the added columns
    op.drop_column('services', 'max_parallel_pros')
    op.drop_column('services', 'parallelable')