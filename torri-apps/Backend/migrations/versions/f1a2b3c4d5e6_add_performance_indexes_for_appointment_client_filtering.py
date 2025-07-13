"""add_performance_indexes_for_appointment_client_filtering

Revision ID: f1a2b3c4d5e6
Revises: e43958bb15dc
Create Date: 2025-07-13 03:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e43958bb15dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for appointment client filtering."""
    # Create composite index for client_id and status (for never_visited filtering)
    op.create_index(
        'idx_appointments_client_status',
        'appointments',
        ['client_id', 'status'],
        unique=False
    )
    
    # Create composite index for client_id, status, and appointment_date (for last_visit_days filtering)
    op.create_index(
        'idx_appointments_client_status_date',
        'appointments',
        ['client_id', 'status', 'appointment_date'],
        unique=False
    )
    
    # Create composite index for status and appointment_date (for date-based filtering)
    op.create_index(
        'idx_appointments_status_date',
        'appointments',
        ['status', 'appointment_date'],
        unique=False
    )


def downgrade() -> None:
    """Remove performance indexes for appointment client filtering."""
    # Drop the indexes in reverse order
    op.drop_index('idx_appointments_status_date', table_name='appointments')
    op.drop_index('idx_appointments_client_status_date', table_name='appointments')
    op.drop_index('idx_appointments_client_status', table_name='appointments')