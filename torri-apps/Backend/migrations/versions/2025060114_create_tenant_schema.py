"""create_tenant_schema

Revision ID: 2025060114
Revises: 1ec49d6f51be
Create Date: 2025-06-01 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '2025060114'
down_revision: Union[str, None] = '1ec49d6f51be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create all tenant tables."""
    
    # Create users_tenant table
    op.create_table('users_tenant',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('GESTOR', 'PROFESSIONAL', 'CLIENT', name='userrole'), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email')
    )
    op.create_index(op.f('ix_users_tenant_email'), 'users_tenant', ['email'], unique=False)
    op.create_index(op.f('ix_users_tenant_tenant_id'), 'users_tenant', ['tenant_id'], unique=False)

    # Create service_categories table
    op.create_table('service_categories',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_category_tenant_name')
    )
    op.create_index(op.f('ix_service_categories_tenant_id'), 'service_categories', ['tenant_id'], unique=False)

    # Create services table
    op.create_table('services',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('commission_percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('category_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['service_categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_services_category_id'), 'services', ['category_id'], unique=False)
    op.create_index(op.f('ix_services_tenant_id'), 'services', ['tenant_id'], unique=False)

    # Create service_professionals_association table
    op.create_table('service_professionals_association',
        sa.Column('service_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
        sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('service_id', 'professional_user_id'),
        sa.UniqueConstraint('service_id', 'professional_user_id', name='uq_service_professional')
    )

    # Create appointments table
    op.create_table('appointments',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('client_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('professional_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('service_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('appointment_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', name='appointmentstatus'), nullable=False),
        sa.Column('total_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('commission_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['users_tenant.id'], ),
        sa.ForeignKeyConstraint(['professional_id'], ['users_tenant.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_appointment_date'), 'appointments', ['appointment_date'], unique=False)
    op.create_index(op.f('ix_appointments_client_id'), 'appointments', ['client_id'], unique=False)
    op.create_index(op.f('ix_appointments_professional_id'), 'appointments', ['professional_id'], unique=False)
    op.create_index(op.f('ix_appointments_service_id'), 'appointments', ['service_id'], unique=False)
    op.create_index(op.f('ix_appointments_start_time'), 'appointments', ['start_time'], unique=False)
    op.create_index(op.f('ix_appointments_status'), 'appointments', ['status'], unique=False)
    op.create_index(op.f('ix_appointments_tenant_id'), 'appointments', ['tenant_id'], unique=False)

    # Create professional_availabilities table
    op.create_table('professional_availabilities',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('day_of_week', sa.Enum('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', name='dayofweek'), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('professional_user_id', 'day_of_week', 'start_time', 'end_time', name='uq_professional_availability')
    )
    op.create_index(op.f('ix_professional_availabilities_professional_user_id'), 'professional_availabilities', ['professional_user_id'], unique=False)
    op.create_index(op.f('ix_professional_availabilities_tenant_id'), 'professional_availabilities', ['tenant_id'], unique=False)

    # Create professional_breaks table
    op.create_table('professional_breaks',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('day_of_week', sa.Enum('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', name='dayofweek'), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('professional_user_id', 'day_of_week', 'start_time', 'end_time', name='uq_professional_break')
    )
    op.create_index(op.f('ix_professional_breaks_professional_user_id'), 'professional_breaks', ['professional_user_id'], unique=False)
    op.create_index(op.f('ix_professional_breaks_tenant_id'), 'professional_breaks', ['tenant_id'], unique=False)

    # Create professional_blocked_times table
    op.create_table('professional_blocked_times',
        sa.Column('id', mysql.CHAR(length=36), nullable=False),
        sa.Column('professional_user_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('tenant_id', mysql.CHAR(length=36), nullable=False),
        sa.Column('block_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('block_type', sa.Enum('TIME_BLOCK', 'DAY_OFF', name='availabilityblocktype'), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['professional_user_id'], ['users_tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('professional_user_id', 'block_date', 'start_time', 'end_time', name='uq_professional_blocked_time')
    )
    op.create_index(op.f('ix_professional_blocked_times_professional_user_id'), 'professional_blocked_times', ['professional_user_id'], unique=False)
    op.create_index(op.f('ix_professional_blocked_times_tenant_id'), 'professional_blocked_times', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Drop all tenant tables."""
    op.drop_table('professional_blocked_times')
    op.drop_table('professional_breaks')
    op.drop_table('professional_availabilities')
    op.drop_table('appointments')
    op.drop_table('service_professionals_association')
    op.drop_table('services')
    op.drop_table('service_categories')
    op.drop_table('users_tenant')