"""add_new_appointment_status_values

Revision ID: d85ac62f0148
Revises: 8fc59245d3d5
Create Date: 2025-06-05 20:22:58.168366

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'd85ac62f0148'
down_revision: Union[str, None] = '8fc59245d3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Update existing NOSHOW records to NO_SHOW
    op.execute("""
        UPDATE appointments 
        SET status = 'NO_SHOW'
        WHERE status = 'NOSHOW'
    """)
    
    # Modify the enum column to include new status values
    op.execute("""
        ALTER TABLE appointments 
        MODIFY COLUMN status ENUM('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') 
        NOT NULL DEFAULT 'SCHEDULED'
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Update NO_SHOW records back to NOSHOW
    op.execute("""
        UPDATE appointments 
        SET status = 'NOSHOW'
        WHERE status = 'NO_SHOW'
    """)
    
    # Update new status values to old ones
    op.execute("""
        UPDATE appointments 
        SET status = CASE status
            WHEN 'CONFIRMED' THEN 'SCHEDULED'
            WHEN 'IN_PROGRESS' THEN 'SCHEDULED'
            ELSE status
        END
    """)
    
    # Restore original enum
    op.execute("""
        ALTER TABLE appointments 
        MODIFY COLUMN status ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED', 'NOSHOW') 
        NOT NULL DEFAULT 'SCHEDULED'
    """)
