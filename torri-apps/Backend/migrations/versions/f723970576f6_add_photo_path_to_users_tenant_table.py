"""Add photo_path to users_tenant table

Revision ID: f723970576f6
Revises: e2cf2cfa95d9
Create Date: 2025-06-04 14:29:06.905407

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'f723970576f6'
down_revision: Union[str, None] = 'e2cf2cfa95d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('professional_availability',
    sa.Column('id', mysql.CHAR(length=36), nullable=False),
    sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
    sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
    sa.Column('day_of_week', sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', name='dayofweek'), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('professional_user_id', 'day_of_week', 'start_time', 'end_time', name='uq_prof_avail_day_time_slot')
    )
    op.create_index(op.f('ix_professional_availability_professional_user_id'), 'professional_availability', ['professional_user_id'], unique=False)
    op.create_index(op.f('ix_professional_availability_tenant_id'), 'professional_availability', ['tenant_id'], unique=False)
    op.create_table('professional_blocked_time',
    sa.Column('id', mysql.CHAR(length=36), nullable=False),
    sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
    sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
    sa.Column('blocked_date', sa.Date(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('block_type', sa.String(length=20), nullable=True),
    sa.Column('reason', sa.String(length=255), nullable=True),
    sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('professional_user_id', 'blocked_date', 'start_time', 'end_time', 'block_type', name='uq_prof_blocked_date_slot_type')
    )
    op.create_index(op.f('ix_professional_blocked_time_professional_user_id'), 'professional_blocked_time', ['professional_user_id'], unique=False)
    op.create_index(op.f('ix_professional_blocked_time_tenant_id'), 'professional_blocked_time', ['tenant_id'], unique=False)
    op.add_column('users_tenant', sa.Column('photo_path', sa.String(length=500), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users_tenant', 'photo_path')
    op.drop_index(op.f('ix_professional_blocked_time_tenant_id'), table_name='professional_blocked_time')
    op.drop_index(op.f('ix_professional_blocked_time_professional_user_id'), table_name='professional_blocked_time')
    op.drop_table('professional_blocked_time')
    op.drop_index(op.f('ix_professional_availability_tenant_id'), table_name='professional_availability')
    op.drop_index(op.f('ix_professional_availability_professional_user_id'), table_name='professional_availability')
    op.drop_table('professional_availability')
    # ### end Alembic commands ###
