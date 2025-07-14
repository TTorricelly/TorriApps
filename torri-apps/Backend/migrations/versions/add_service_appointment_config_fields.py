"""add service appointment configuration fields

Revision ID: add_service_config
Revises: 1f06f512a137
Create Date: 2025-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_service_config'
down_revision: Union[str, None] = '1f06f512a137'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add service appointment configuration fields and tables."""
    
    # Add missing fields to services table
    op.add_column('services', sa.Column('price_subject_to_evaluation', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('services', sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('services', sa.Column('execution_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('services', sa.Column('execution_flexible', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('services', sa.Column('processing_time', sa.Integer(), nullable=True))
    op.add_column('services', sa.Column('finishing_time', sa.Integer(), nullable=True))
    op.add_column('services', sa.Column('transition_time', sa.Integer(), nullable=True))
    op.add_column('services', sa.Column('allows_parallel_during_processing', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('services', sa.Column('can_be_done_during_processing', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create indexes for new fields
    op.create_index('idx_services_display_order', 'services', ['display_order'])
    op.create_index('idx_services_execution_order', 'services', ['execution_order'])
    op.create_index('idx_services_execution_flexible', 'services', ['execution_flexible'])
    
    # Create service_compatibility table
    op.create_table('service_compatibility',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('service_a_id', sa.UUID(), nullable=False),
        sa.Column('service_b_id', sa.UUID(), nullable=False),
        sa.Column('can_run_parallel', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('parallel_type', sa.String(length=50), nullable=False, server_default='never'),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('service_a_id != service_b_id', name='check_no_self_compatibility'),
        sa.ForeignKeyConstraint(['service_a_id'], ['services.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_b_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_a_id', 'service_b_id', name='uq_service_compatibility')
    )
    
    # Create indexes for service_compatibility
    op.create_index('idx_service_compatibility_reverse', 'service_compatibility', ['service_b_id', 'service_a_id'])
    op.create_index('idx_service_compatibility_type', 'service_compatibility', ['parallel_type'])
    
    # Create service_variation_groups table
    op.create_table('service_variation_groups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('multiple_choice', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('service_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_id', 'name', name='uq_service_variation_group_name')
    )
    
    # Create indexes for service_variation_groups
    op.create_index('idx_service_variation_groups_service_id', 'service_variation_groups', ['service_id'])
    op.create_index('idx_service_variation_groups_created_at', 'service_variation_groups', ['created_at'])
    
    # Create service_variations table
    op.create_table('service_variations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price_delta', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'),
        sa.Column('duration_delta', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('price_subject_to_evaluation', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('service_variation_group_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['service_variation_group_id'], ['service_variation_groups.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_variation_group_id', 'name', name='uq_service_variation_name')
    )
    
    # Create indexes for service_variations
    op.create_index('idx_service_variations_group_id', 'service_variations', ['service_variation_group_id'])
    op.create_index('idx_service_variations_order', 'service_variations', ['service_variation_group_id', 'display_order'])
    op.create_index('idx_service_variations_created_at', 'service_variations', ['created_at'])


def downgrade() -> None:
    """Remove service appointment configuration fields and tables."""
    
    # Drop tables
    op.drop_table('service_variations')
    op.drop_table('service_variation_groups')
    op.drop_table('service_compatibility')
    
    # Drop indexes from services table
    op.drop_index('idx_services_execution_flexible', table_name='services')
    op.drop_index('idx_services_execution_order', table_name='services')
    op.drop_index('idx_services_display_order', table_name='services')
    
    # Remove columns from services table
    op.drop_column('services', 'can_be_done_during_processing')
    op.drop_column('services', 'allows_parallel_during_processing')
    op.drop_column('services', 'transition_time')
    op.drop_column('services', 'finishing_time')
    op.drop_column('services', 'processing_time')
    op.drop_column('services', 'execution_flexible')
    op.drop_column('services', 'execution_order')
    op.drop_column('services', 'display_order')
    op.drop_column('services', 'price_subject_to_evaluation')