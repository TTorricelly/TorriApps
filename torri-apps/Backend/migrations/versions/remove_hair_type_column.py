"""remove hair_type column from users table

Revision ID: remove_hair_type_column
Revises: add_user_labels_association
Create Date: 2025-07-03 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'remove_hair_type_column'
down_revision: Union[str, None] = 'add_user_labels_association'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove hair_type column from users table."""
    # Drop the hair_type column from users table
    op.drop_column('users', 'hair_type')


def downgrade() -> None:
    """Add hair_type column back to users table."""
    # Create the enum type for hair_type
    hair_type_enum = sa.Enum('LISO', 'ONDULADO', 'CACHEADO', 'CRESPO', name='hairtype')
    hair_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Add hair_type column back with the enum type
    op.add_column('users', sa.Column('hair_type', hair_type_enum, nullable=True))