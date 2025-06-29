"""add commission tables

Revision ID: add_commission_tables
Revises: 173bb7c6375b
Create Date: 2025-06-27 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_commission_tables'
down_revision: Union[str, None] = '173bb7c6375b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add commission tables for salon commission management."""
    
    # Create payment status enum
    op.execute("CREATE TYPE commissionpaymentstatus AS ENUM ('PENDING', 'PAID', 'REVERSED')")
    
    # Create payment method enum  
    op.execute("CREATE TYPE commissionpaymentmethod AS ENUM ('CASH', 'PIX', 'BANK_TRANSFER', 'CARD', 'OTHER')")
    
    # Create commissions table
    op.create_table(
        'commissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('professional_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False),
        
        # Financial data (captured at commission creation)
        sa.Column('service_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('commission_percentage', sa.Numeric(5, 2), nullable=False),
        sa.Column('calculated_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('adjusted_value', sa.Numeric(10, 2), nullable=True),
        sa.Column('adjustment_reason', sa.Text(), nullable=True),
        
        # Payment tracking
        sa.Column('payment_status', sa.Enum(name='commissionpaymentstatus'), nullable=False, server_default='PENDING', index=True),
        
        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        
        # Constraints
        sa.UniqueConstraint('appointment_id', name='uq_commission_appointment'),
        sa.CheckConstraint('calculated_value >= 0', name='chk_commission_positive'),
        sa.CheckConstraint('adjusted_value IS NULL OR adjusted_value >= 0', name='chk_adjusted_positive')
    )
    
    # Create commission payments table (batch payment records)
    op.create_table(
        'commission_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('professional_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        
        # Payment details
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('payment_method', sa.Enum(name='commissionpaymentmethod'), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False, index=True),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        
        # Documentation  
        sa.Column('receipt_url', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        
        # Constraints
        sa.CheckConstraint('total_amount > 0', name='chk_payment_amount_positive')
    )
    
    # Create link table for commission payments
    op.create_table(
        'commission_payment_items',
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('commission_payments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('commission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('commissions.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('payment_id', 'commission_id')
    )
    
    # Create indexes for performance
    op.create_index('ix_commissions_professional_date', 'commissions', ['professional_id', 'created_at'])
    op.create_index('ix_commissions_created_at', 'commissions', ['created_at'])
    op.create_index('ix_commission_payments_professional', 'commission_payments', ['professional_id'])


def downgrade() -> None:
    """Remove commission tables."""
    # Drop indexes
    op.drop_index('ix_commission_payments_professional', table_name='commission_payments')
    op.drop_index('ix_commissions_created_at', table_name='commissions')
    op.drop_index('ix_commissions_professional_date', table_name='commissions')
    
    # Drop tables
    op.drop_table('commission_payment_items')
    op.drop_table('commission_payments')
    op.drop_table('commissions')
    
    # Drop enums
    op.execute("DROP TYPE commissionpaymentmethod")
    op.execute("DROP TYPE commissionpaymentstatus")