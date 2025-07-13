"""add display_order to users table

Revision ID: 2025_07_13_add_display_order_to_users
Revises: 1f06f512a137
Create Date: 2025-07-13 03:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025_07_13_add_display_order_to_users'
down_revision: Union[str, None] = '1f06f512a137'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add display_order column to users table."""
    # Add display_order column to users table
    op.add_column('users', sa.Column('display_order', sa.Integer(), nullable=True, default=999))


def downgrade() -> None:
    """Remove display_order column from users table."""
    # Remove display_order column from users table
    op.drop_column('users', 'display_order')