"""Add missing enum values for appointment statuses

Revision ID: add_missing_enum_values
Revises: f5839d706545  
Create Date: 2025-06-29 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_missing_enum_values'
down_revision: Union[str, None] = 'f5839d706545'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing enum values."""
    
    # PostgreSQL approach: Check if enum value exists before adding
    # appointment_groups_status_enum values
    op.execute("""
        DO $$ 
        BEGIN
            -- Add CONFIRMED if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'CONFIRMED') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'CONFIRMED';
            END IF;
            
            -- Add WALK_IN if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'WALK_IN') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'WALK_IN';
            END IF;
            
            -- Add PARTIALLY_COMPLETED if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'PARTIALLY_COMPLETED') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'PARTIALLY_COMPLETED';
            END IF;
            
            -- Add READY_TO_PAY if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'READY_TO_PAY') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'READY_TO_PAY';
            END IF;
            
            -- Add IN_SERVICE if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'IN_SERVICE') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'IN_SERVICE';
            END IF;
            
            -- Add ARRIVED if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointment_groups_status_enum' AND e.enumlabel = 'ARRIVED') THEN
                ALTER TYPE appointment_groups_status_enum ADD VALUE 'ARRIVED';
            END IF;
        END $$;
    """)
    
    # appointments_status_enum values
    op.execute("""
        DO $$ 
        BEGIN
            -- Add CONFIRMED if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'CONFIRMED') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'CONFIRMED';
            END IF;
            
            -- Add WALK_IN if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'WALK_IN') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'WALK_IN';
            END IF;
            
            -- Add NO_SHOW if it doesn't exist  
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'NO_SHOW') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'NO_SHOW';
            END IF;
            
            -- Add READY_TO_PAY if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'READY_TO_PAY') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'READY_TO_PAY';
            END IF;
            
            -- Add IN_SERVICE if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'IN_SERVICE') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'IN_SERVICE';
            END IF;
            
            -- Add ARRIVED if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                          WHERE t.typname = 'appointments_status_enum' AND e.enumlabel = 'ARRIVED') THEN
                ALTER TYPE appointments_status_enum ADD VALUE 'ARRIVED';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema - removing enum values is complex and risky."""
    # Removing enum values is complex in PostgreSQL and can break existing data
    # It's safer to leave them in place for backward compatibility
    pass