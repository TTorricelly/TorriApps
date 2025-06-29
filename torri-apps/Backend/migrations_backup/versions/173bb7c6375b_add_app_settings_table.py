"""add app settings table

Revision ID: 173bb7c6375b
Revises: c2c89af60f17
Create Date: 2025-06-19 16:14:42.360163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '173bb7c6375b'
down_revision: Union[str, None] = 'c2c89af60f17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add app_settings table for global application configuration."""
    
    # Create app_settings table
    op.create_table(
        'app_settings',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('data_type', sa.Enum('string', 'integer', 'boolean', 'decimal', name='setting_data_type'), nullable=False, server_default='string'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index(op.f('ix_app_settings_key'), 'app_settings', ['key'], unique=True)
    
    # Insert default settings
    op.execute("""
        INSERT INTO app_settings (id, `key`, value, description, data_type, created_at, updated_at) VALUES 
        (UUID(), 'default_pros_suggested', '2', 'Default number of professionals suggested for appointments', 'integer', NOW(), NOW()),
        (UUID(), 'booking_advance_days', '30', 'Maximum days in advance that appointments can be booked', 'integer', NOW(), NOW()),
        (UUID(), 'default_appointment_duration', '60', 'Default appointment duration in minutes', 'integer', NOW(), NOW()),
        (UUID(), 'allow_overlapping_appointments', 'false', 'Allow professionals to have overlapping appointments', 'boolean', NOW(), NOW()),
        (UUID(), 'auto_confirm_appointments', 'false', 'Automatically confirm appointments without manual approval', 'boolean', NOW(), NOW())
    """)


def downgrade() -> None:
    """Remove app_settings table."""
    op.drop_index(op.f('ix_app_settings_key'), table_name='app_settings')
    op.drop_table('app_settings')
