"""Add payments tables only

Revision ID: 8fc87de1d3f8
Revises: add_missing_enum_values
Create Date: 2025-06-29 18:58:20.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8fc87de1d3f8'
down_revision: Union[str, None] = 'add_missing_enum_values'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add payment system tables."""
    # Create new ENUM types for payment system (if they don't exist)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
                CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
                CREATE TYPE payment_method_enum AS ENUM ('CASH', 'DEBIT', 'CREDIT', 'PIX');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type_enum') THEN
                CREATE TYPE item_type_enum AS ENUM ('APPOINTMENT_GROUP', 'RETAIL_PRODUCT');
            END IF;
        END $$;
    """)
    
    # Create payments table
    op.create_table('payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('payment_id', sa.String(length=100), nullable=False),
        sa.Column('client_id', sa.UUID(), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
        sa.Column('tip_amount', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_method', postgresql.ENUM('CASH', 'DEBIT', 'CREDIT', 'PIX', name='payment_method_enum', create_type=False), nullable=False),
        sa.Column('payment_status', postgresql.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', name='payment_status_enum', create_type=False), nullable=False, default='COMPLETED'),
        sa.Column('processor_transaction_id', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('payment_id')
    )
    op.create_index(op.f('ix_payments_payment_id'), 'payments', ['payment_id'], unique=False)
    
    # Create payment_items table
    op.create_table('payment_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('payment_id', sa.UUID(), nullable=False),
        sa.Column('item_type', postgresql.ENUM('APPOINTMENT_GROUP', 'RETAIL_PRODUCT', name='item_type_enum', create_type=False), nullable=False),
        sa.Column('reference_id', sa.UUID(), nullable=True),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, default=1),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Remove payment system tables."""
    # Drop payment tables
    op.drop_table('payment_items')
    op.drop_index(op.f('ix_payments_payment_id'), table_name='payments')
    op.drop_table('payments')
    
    # Drop ENUM types for payment system
    op.execute('DROP TYPE IF EXISTS item_type_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS payment_method_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS payment_status_enum CASCADE')