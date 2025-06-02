"""merge 2025060114 and f4ce2c253945

Revision ID: 4d0ebe0dbd3a
Revises: 2025060114, f4ce2c253945
Create Date: 2025-06-02 11:23:25.535370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d0ebe0dbd3a'
down_revision: Union[str, None] = ('2025060114', 'f4ce2c253945')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
