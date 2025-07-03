"""add user labels association

Revision ID: add_user_labels_association
Revises: 5422fcd5575d
Create Date: 2025-07-03 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_user_labels_association'
down_revision: Union[str, None] = '5422fcd5575d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_labels association table."""
    # Create user_labels association table
    op.create_table('user_labels',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('label_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'label_id'),
        sa.UniqueConstraint('user_id', 'label_id', name='uq_user_label')
    )
    
    # Create indexes for better performance
    op.create_index('idx_user_labels_user_id', 'user_labels', ['user_id'])
    op.create_index('idx_user_labels_label_id', 'user_labels', ['label_id'])


def downgrade() -> None:
    """Drop user_labels association table."""
    op.drop_index('idx_user_labels_label_id', table_name='user_labels')
    op.drop_index('idx_user_labels_user_id', table_name='user_labels')
    op.drop_table('user_labels')