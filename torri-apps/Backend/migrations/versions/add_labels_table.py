"""Add labels table for categorization and organization

Revision ID: add_labels_table
Revises: f5839d706545
Create Date: 2025-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_labels_table'
down_revision: Union[str, None] = 'f5839d706545'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add labels table."""
    # Create labels table with safe checks
    op.execute("""
        DO $$ 
        BEGIN 
            -- Create labels table if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_name = 'labels') THEN
                CREATE TABLE labels (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    color VARCHAR(7) NOT NULL DEFAULT '#00BFFF',
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    tenant_id UUID NULL
                );
            END IF;
            
            -- Create unique index on name if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'labels' AND indexname = 'uq_labels_name') THEN
                CREATE UNIQUE INDEX uq_labels_name ON labels (name);
            END IF;
            
            -- Create index on is_active if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'labels' AND indexname = 'ix_labels_is_active') THEN
                CREATE INDEX ix_labels_is_active ON labels (is_active);
            END IF;
            
            -- Create index on created_at if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'labels' AND indexname = 'ix_labels_created_at') THEN
                CREATE INDEX ix_labels_created_at ON labels (created_at);
            END IF;
            
            -- Create trigger for updated_at if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                          WHERE trigger_name = 'update_labels_updated_at' AND table_name = 'labels') THEN
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
                
                CREATE TRIGGER update_labels_updated_at
                    BEFORE UPDATE ON labels
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            END IF;
            
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema - Remove labels table."""
    # Drop labels table and related objects if they exist
    op.execute("""
        DO $$ 
        BEGIN 
            -- Drop trigger if it exists
            IF EXISTS (SELECT 1 FROM information_schema.triggers 
                      WHERE trigger_name = 'update_labels_updated_at' AND table_name = 'labels') THEN
                DROP TRIGGER update_labels_updated_at ON labels;
            END IF;
            
            -- Drop function if it exists and no other tables use it
            -- Note: This is a simplified approach, in production you might want to check
            -- if the function is used by other triggers before dropping
            
            -- Drop table if it exists (this will also drop associated indexes)
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_name = 'labels') THEN
                DROP TABLE labels;
            END IF;
            
        END $$;
    """)