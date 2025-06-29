"""Clean baseline migration - synced with database

Revision ID: acc597979661
Revises: 
Create Date: 2025-06-28 22:31:47.520691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'acc597979661'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # This is a baseline migration - database is already in correct state
    # No changes needed
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # This is a baseline migration - no changes to revert
    pass