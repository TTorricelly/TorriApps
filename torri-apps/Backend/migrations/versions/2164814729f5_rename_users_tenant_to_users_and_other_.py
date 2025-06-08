"""rename_users_tenant_to_users_and_other_alignments

Revision ID: 2164814729f5
Revises: 0a118bc387cd
Create Date: 2025-06-08 00:06:26.308065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2164814729f5'
down_revision: Union[str, None] = '0a118bc387cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
