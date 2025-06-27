"""merge commission tables with latest migrations

Revision ID: 80b51631c2d0
Revises: 3fe924aa9500, add_commission_tables
Create Date: 2025-06-27 18:26:18.353756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80b51631c2d0'
down_revision: Union[str, None] = ('3fe924aa9500', 'add_commission_tables')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
