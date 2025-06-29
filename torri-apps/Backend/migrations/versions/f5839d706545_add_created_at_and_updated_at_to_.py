"""Add created_at and updated_at to appointments

Revision ID: f5839d706545
Revises: acc597979661
Create Date: 2025-06-29 02:28:20.215137

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5839d706545'
down_revision: Union[str, None] = 'acc597979661'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if columns exist before adding them
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'appointments' AND column_name = 'created_at') THEN
                ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'appointments' AND column_name = 'updated_at') THEN
                ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove columns if they exist
    op.execute("""
        DO $$ 
        BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'appointments' AND column_name = 'updated_at') THEN
                ALTER TABLE appointments DROP COLUMN updated_at;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'appointments' AND column_name = 'created_at') THEN
                ALTER TABLE appointments DROP COLUMN created_at;
            END IF;
        END $$;
    """)
