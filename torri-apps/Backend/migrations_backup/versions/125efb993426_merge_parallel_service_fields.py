"""merge parallel service fields

Revision ID: 125efb993426
Revises: 6342218c59f9, abc123def456
Create Date: 2025-06-19 13:22:57.062999

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '125efb993426'
down_revision: Union[str, None] = ('6342218c59f9', 'abc123def456')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
