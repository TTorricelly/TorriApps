"""add_appointment_groups_simple

Revision ID: simple_group_migration
Revises: 173bb7c6375b
Create Date: 2025-06-19 19:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'simple_group_migration'
down_revision: Union[str, None] = '173bb7c6375b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add appointment groups table and group_id column to appointments."""
    
    # Create appointment_groups table
    op.create_table('appointment_groups',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', UUID(as_uuid=True), nullable=False),
        sa.Column('total_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('total_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIALLY_COMPLETED', name='appointmentgroupstatus'), nullable=False),
        sa.Column('notes_by_client', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for appointment_groups
    op.create_index('ix_appointment_groups_client_id', 'appointment_groups', ['client_id'], unique=False)
    op.create_index('ix_appointment_groups_start_time', 'appointment_groups', ['start_time'], unique=False)
    op.create_index('ix_appointment_groups_status', 'appointment_groups', ['status'], unique=False)
    
    # Add group_id column to appointments table
    op.add_column('appointments', sa.Column('group_id', UUID(as_uuid=True), nullable=True))
    
    # Add index for group_id
    op.create_index('ix_appointments_group_id', 'appointments', ['group_id'], unique=False)
    
    # Add foreign key constraint for group_id
    op.create_foreign_key('fk_appointments_group_id', 'appointments', 'appointment_groups', ['group_id'], ['id'])


def downgrade() -> None:
    """Remove appointment groups functionality."""
    
    # Drop foreign key constraint
    op.drop_constraint('fk_appointments_group_id', 'appointments', type_='foreignkey')
    
    # Drop index
    op.drop_index('ix_appointments_group_id', table_name='appointments')
    
    # Drop group_id column
    op.drop_column('appointments', 'group_id')
    
    # Drop appointment_groups table indexes
    op.drop_index('ix_appointment_groups_status', table_name='appointment_groups')
    op.drop_index('ix_appointment_groups_start_time', table_name='appointment_groups')
    op.drop_index('ix_appointment_groups_client_id', table_name='appointment_groups')
    
    # Drop appointment_groups table
    op.drop_table('appointment_groups')