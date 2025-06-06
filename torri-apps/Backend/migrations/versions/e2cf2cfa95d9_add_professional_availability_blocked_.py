"""Add professional availability, blocked times, and breaks tables

Revision ID: e2cf2cfa95d9
Revises: 1081fede8663
Create Date: 2025-06-04 11:33:35.382825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'e2cf2cfa95d9'
down_revision: Union[str, None] = '1081fede8663'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('price_at_booking', sa.Numeric(precision=10, scale=2), nullable=False))
    op.add_column('appointments', sa.Column('paid_manually', sa.Boolean(), nullable=False))
    op.add_column('appointments', sa.Column('notes_by_client', sa.String(length=500), nullable=True))
    op.add_column('appointments', sa.Column('notes_by_professional', sa.String(length=500), nullable=True))
    op.create_unique_constraint('uq_appointment_professional_datetime', 'appointments', ['professional_id', 'appointment_date', 'start_time'])
    op.create_foreign_key(None, 'appointments', 'users_tenant', ['client_id'], ['id'])
    op.drop_column('appointments', 'notes')
    op.drop_column('appointments', 'total_price')
    op.drop_column('appointments', 'commission_amount')
    op.create_unique_constraint('uq_prof_avail_day_time_slot', 'professional_availabilities', ['professional_user_id', 'day_of_week', 'start_time', 'end_time'])
    op.create_foreign_key(None, 'professional_availabilities', 'users_tenant', ['professional_user_id'], ['id'], ondelete='CASCADE')
    op.alter_column('professional_blocked_times', 'block_type',
               existing_type=mysql.ENUM('TIME_BLOCK', 'DAY_OFF'),
               type_=sa.Enum('BLOCKED_SLOT', 'DAY_OFF', name='availabilityblocktype'),
               existing_nullable=False)
    op.create_unique_constraint('uq_prof_block_date_slot_type', 'professional_blocked_times', ['professional_user_id', 'block_date', 'start_time', 'end_time', 'block_type'])
    op.create_foreign_key(None, 'professional_blocked_times', 'users_tenant', ['professional_user_id'], ['id'], ondelete='CASCADE')
    op.create_unique_constraint('uq_prof_break_day_time_slot', 'professional_breaks', ['professional_user_id', 'day_of_week', 'start_time', 'end_time'])
    op.create_foreign_key(None, 'professional_breaks', 'users_tenant', ['professional_user_id'], ['id'], ondelete='CASCADE')
    op.alter_column('service_categories', 'display_order',
               existing_type=mysql.INTEGER(),
               server_default=None,
               existing_nullable=False)
    op.alter_column('service_categories', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=True)
    op.create_unique_constraint(None, 'service_categories', ['name'])
    op.add_column('services', sa.Column('is_active', sa.Boolean(), nullable=False))
    op.add_column('services', sa.Column('image_liso', sa.String(length=255), nullable=True))
    op.add_column('services', sa.Column('image_ondulado', sa.String(length=255), nullable=True))
    op.add_column('services', sa.Column('image_cacheado', sa.String(length=255), nullable=True))
    op.add_column('services', sa.Column('image_crespo', sa.String(length=255), nullable=True))
    op.alter_column('services', 'description',
               existing_type=mysql.VARCHAR(length=500),
               type_=sa.Text(),
               existing_nullable=True)
    op.alter_column('services', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=True)
    op.alter_column('tenants', 'db_schema_name',
               existing_type=mysql.VARCHAR(length=100),
               nullable=True)
    op.alter_column('users_tenant', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=True)
    op.drop_index('ix_users_tenant_email', table_name='users_tenant')
    op.create_index(op.f('ix_users_tenant_email'), 'users_tenant', ['email'], unique=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_users_tenant_email'), table_name='users_tenant')
    op.create_index('ix_users_tenant_email', 'users_tenant', ['email'], unique=False)
    op.alter_column('users_tenant', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=False)
    op.alter_column('tenants', 'db_schema_name',
               existing_type=mysql.VARCHAR(length=100),
               nullable=False)
    op.alter_column('services', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=False)
    op.alter_column('services', 'description',
               existing_type=sa.Text(),
               type_=mysql.VARCHAR(length=500),
               existing_nullable=True)
    op.drop_column('services', 'image_crespo')
    op.drop_column('services', 'image_cacheado')
    op.drop_column('services', 'image_ondulado')
    op.drop_column('services', 'image_liso')
    op.drop_column('services', 'is_active')
    op.drop_constraint(None, 'service_categories', type_='unique')
    op.alter_column('service_categories', 'tenant_id',
               existing_type=mysql.CHAR(length=36),
               nullable=False)
    op.alter_column('service_categories', 'display_order',
               existing_type=mysql.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=False)
    op.drop_constraint(None, 'professional_breaks', type_='foreignkey')
    op.drop_constraint('uq_prof_break_day_time_slot', 'professional_breaks', type_='unique')
    op.drop_constraint(None, 'professional_blocked_times', type_='foreignkey')
    op.drop_constraint('uq_prof_block_date_slot_type', 'professional_blocked_times', type_='unique')
    op.alter_column('professional_blocked_times', 'block_type',
               existing_type=sa.Enum('BLOCKED_SLOT', 'DAY_OFF', name='availabilityblocktype'),
               type_=mysql.ENUM('TIME_BLOCK', 'DAY_OFF'),
               existing_nullable=False)
    op.drop_constraint(None, 'professional_availabilities', type_='foreignkey')
    op.drop_constraint('uq_prof_avail_day_time_slot', 'professional_availabilities', type_='unique')
    op.add_column('appointments', sa.Column('commission_amount', mysql.DECIMAL(precision=10, scale=2), nullable=True))
    op.add_column('appointments', sa.Column('total_price', mysql.DECIMAL(precision=10, scale=2), nullable=True))
    op.add_column('appointments', sa.Column('notes', mysql.VARCHAR(length=500), nullable=True))
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    op.drop_constraint('uq_appointment_professional_datetime', 'appointments', type_='unique')
    op.drop_column('appointments', 'notes_by_professional')
    op.drop_column('appointments', 'notes_by_client')
    op.drop_column('appointments', 'paid_manually')
    op.drop_column('appointments', 'price_at_booking')
    # ### end Alembic commands ###
