"""allow_overlapping_appointments_same_client

Revision ID: 36becb0facb0
Revises: d85ac62f0148
Create Date: 2025-06-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '36becb0facb0'
down_revision: Union[str, None] = 'd85ac62f0148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop unique constraint that prevented multiple appointments at the same
    time for a professional."""
    op.drop_constraint('uq_appointment_professional_datetime', 'appointments', type_='unique')


def downgrade() -> None:
    """Recreate unique constraint on appointment start time."""
    op.create_unique_constraint(
        'uq_appointment_professional_datetime',
        'appointments',
        ['professional_id', 'appointment_date', 'start_time']
    )
