"""merge company table with existing migrations

Revision ID: a72327622cb8
Revises: 1717b93c7aa3, simple_group_migration
Create Date: 2025-06-19 23:02:29.951738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a72327622cb8'
down_revision: Union[str, None] = ('1717b93c7aa3', 'simple_group_migration')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
