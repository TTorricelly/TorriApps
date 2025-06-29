"""add_category_fields

Revision ID: 5a4be13da19e
Revises: ed88cb17d1e5
Create Date: 2025-06-02 22:36:45.287871

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a4be13da19e'
down_revision: Union[str, None] = 'ed88cb17d1e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add display_order and icon_path fields to service_categories table."""
    
    # Add display_order column with default value 0
    op.add_column('service_categories', sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))
    
    # Add icon_path column (nullable)
    op.add_column('service_categories', sa.Column('icon_path', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove display_order and icon_path fields from service_categories table."""
    
    # Remove the added columns
    op.drop_column('service_categories', 'icon_path')
    op.drop_column('service_categories', 'display_order')
