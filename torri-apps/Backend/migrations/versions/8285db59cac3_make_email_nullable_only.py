"""make_email_nullable_only

Revision ID: 8285db59cac3
Revises: 4bf03566014f
Create Date: 2025-06-30 01:51:27.532781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8285db59cac3'
down_revision: Union[str, None] = '8fc87de1d3f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make email column nullable to allow walk-in clients without email."""
    # Make email column nullable
    op.alter_column('users', 'email', nullable=True)


def downgrade() -> None:
    """Revert email column to not nullable."""
    # Note: This will fail if there are NULL emails in the database
    op.alter_column('users', 'email', nullable=False)
