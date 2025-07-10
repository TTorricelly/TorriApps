"""make_tenant_id_nullable_in_professional_breaks

Revision ID: e43958bb15dc
Revises: 74932cc09e8f
Create Date: 2025-07-10 16:37:33.307817

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e43958bb15dc'
down_revision: Union[str, None] = '74932cc09e8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
