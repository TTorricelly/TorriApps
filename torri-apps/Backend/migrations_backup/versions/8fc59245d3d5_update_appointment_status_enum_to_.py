"""update_appointment_status_enum_to_uppercase

Revision ID: 8fc59245d3d5
Revises: f723970576f6
Create Date: 2025-06-05 11:40:40.441879

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8fc59245d3d5'
down_revision: Union[str, None] = 'f723970576f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Update existing records to use uppercase values
    op.execute("""
        UPDATE appointments 
        SET status = CASE status
            WHEN 'scheduled' THEN 'SCHEDULED'
            WHEN 'confirmed' THEN 'SCHEDULED'  -- Map confirmed to SCHEDULED as we don't have CONFIRMED in Python enum
            WHEN 'completed' THEN 'COMPLETED'
            WHEN 'cancelled' THEN 'CANCELLED'
            WHEN 'no_show' THEN 'NOSHOW'
            ELSE status
        END
    """)
    
    # Modify the enum column to use uppercase values with uppercase default
    op.execute("""
        ALTER TABLE appointments 
        MODIFY COLUMN status ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED', 'NOSHOW') 
        NOT NULL DEFAULT 'SCHEDULED'
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Update records back to lowercase
    op.execute("""
        UPDATE appointments 
        SET status = CASE status
            WHEN 'SCHEDULED' THEN 'scheduled'
            WHEN 'COMPLETED' THEN 'completed'
            WHEN 'CANCELLED' THEN 'cancelled'
            WHEN 'NOSHOW' THEN 'no_show'
            ELSE status
        END
    """)
    
    # Restore original enum with lowercase values
    op.execute("""
        ALTER TABLE appointments 
        MODIFY COLUMN status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') 
        NOT NULL DEFAULT 'scheduled'
    """)
