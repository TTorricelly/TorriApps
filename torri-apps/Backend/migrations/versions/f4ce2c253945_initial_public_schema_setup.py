"""initial_public_schema_setup

Revision ID: f4ce2c253945
Revises: 0fdfc8ad4b52
Create Date: 2025-06-01 00:26:13.133317

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4ce2c253945'
down_revision: Union[str, None] = '0fdfc8ad4b52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
