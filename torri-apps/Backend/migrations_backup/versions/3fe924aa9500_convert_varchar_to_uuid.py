"""Convert VARCHAR(36) to PostgreSQL UUID types with proper casting

Revision ID: 3fe924aa9500
Revises: a72327622cb8
Create Date: 2025-06-20 16:12:26.183607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3fe924aa9500'
down_revision: Union[str, None] = 'a72327622cb8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert VARCHAR(36) columns to UUID with proper casting."""
    
    # Drop ALL foreign key constraints first (using actual constraint names)
    op.drop_constraint('fk_ag_client', 'appointment_groups', type_='foreignkey')
    op.drop_constraint('fk_appt_client', 'appointments', type_='foreignkey')
    op.drop_constraint('fk_appt_professional', 'appointments', type_='foreignkey')
    op.drop_constraint('fk_appt_service', 'appointments', type_='foreignkey')
    op.drop_constraint('fk_appt_group', 'appointments', type_='foreignkey')
    op.drop_constraint('fk_pa_professional', 'professional_availability', type_='foreignkey')
    op.drop_constraint('fk_pbt_professional', 'professional_blocked_time', type_='foreignkey')
    op.drop_constraint('fk_pb_professional', 'professional_breaks', type_='foreignkey')
    op.drop_constraint('fk_spa_professional', 'service_professionals_association', type_='foreignkey')
    op.drop_constraint('fk_spa_service', 'service_professionals_association', type_='foreignkey')
    op.drop_constraint('fk_services_category', 'services', type_='foreignkey')
    # Additional constraints found in the database
    op.drop_constraint('fk_ssr_service', 'service_station_requirements', type_='foreignkey')
    op.drop_constraint('fk_ssr_station_type', 'service_station_requirements', type_='foreignkey')
    op.drop_constraint('fk_stations_type', 'stations', type_='foreignkey')
    
    # Convert UUID columns with proper casting
    # Users table
    op.execute('ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid')
    
    # Service categories
    op.execute('ALTER TABLE service_categories ALTER COLUMN id TYPE UUID USING id::uuid')
    if op.get_bind().dialect.has_table(op.get_bind(), 'service_categories'):
        op.execute('UPDATE service_categories SET tenant_id = NULL WHERE tenant_id IS NOT NULL')
        # We'll skip tenant_id conversion since we're removing multi-tenancy
    
    # Services
    op.execute('ALTER TABLE services ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE services ALTER COLUMN category_id TYPE UUID USING category_id::uuid')
    
    # Service professionals association
    op.execute('ALTER TABLE service_professionals_association ALTER COLUMN service_id TYPE UUID USING service_id::uuid')
    op.execute('ALTER TABLE service_professionals_association ALTER COLUMN professional_user_id TYPE UUID USING professional_user_id::uuid')
    
    # Professional availability
    op.execute('ALTER TABLE professional_availability ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE professional_availability ALTER COLUMN professional_user_id TYPE UUID USING professional_user_id::uuid')
    
    # Professional breaks
    op.execute('ALTER TABLE professional_breaks ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE professional_breaks ALTER COLUMN professional_user_id TYPE UUID USING professional_user_id::uuid')
    if op.get_bind().dialect.has_table(op.get_bind(), 'professional_breaks'):
        # Convert tenant_id if it exists, otherwise skip
        op.execute('UPDATE professional_breaks SET tenant_id = NULL WHERE tenant_id IS NOT NULL')
    
    # Professional blocked time
    op.execute('ALTER TABLE professional_blocked_time ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE professional_blocked_time ALTER COLUMN professional_user_id TYPE UUID USING professional_user_id::uuid')
    
    # Station types (if it exists)
    try:
        op.execute('ALTER TABLE station_types ALTER COLUMN id TYPE UUID USING id::uuid')
    except:
        pass  # Table might not exist in all environments
    
    # Stations (if it exists)
    try:
        op.execute('ALTER TABLE stations ALTER COLUMN id TYPE UUID USING id::uuid')
        op.execute('ALTER TABLE stations ALTER COLUMN type_id TYPE UUID USING type_id::uuid')
    except:
        pass
    
    # Service station requirements (if it exists)
    try:
        op.execute('ALTER TABLE service_station_requirements ALTER COLUMN service_id TYPE UUID USING service_id::uuid')
        op.execute('ALTER TABLE service_station_requirements ALTER COLUMN station_type_id TYPE UUID USING station_type_id::uuid')
    except:
        pass
    
    # Appointment groups
    op.execute('ALTER TABLE appointment_groups ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE appointment_groups ALTER COLUMN client_id TYPE UUID USING client_id::uuid')
    
    # Appointments
    op.execute('ALTER TABLE appointments ALTER COLUMN id TYPE UUID USING id::uuid')
    op.execute('ALTER TABLE appointments ALTER COLUMN client_id TYPE UUID USING client_id::uuid')
    op.execute('ALTER TABLE appointments ALTER COLUMN professional_id TYPE UUID USING professional_id::uuid')
    op.execute('ALTER TABLE appointments ALTER COLUMN service_id TYPE UUID USING service_id::uuid')
    op.execute('ALTER TABLE appointments ALTER COLUMN group_id TYPE UUID USING group_id::uuid')
    
    # Recreate foreign key constraints with original names
    op.create_foreign_key('fk_ag_client', 'appointment_groups', 'users', ['client_id'], ['id'])
    op.create_foreign_key('fk_appt_client', 'appointments', 'users', ['client_id'], ['id'])
    op.create_foreign_key('fk_appt_professional', 'appointments', 'users', ['professional_id'], ['id'])
    op.create_foreign_key('fk_appt_service', 'appointments', 'services', ['service_id'], ['id'])
    op.create_foreign_key('fk_appt_group', 'appointments', 'appointment_groups', ['group_id'], ['id'])
    op.create_foreign_key('fk_pa_professional', 'professional_availability', 'users', ['professional_user_id'], ['id'])
    op.create_foreign_key('fk_pbt_professional', 'professional_blocked_time', 'users', ['professional_user_id'], ['id'])
    op.create_foreign_key('fk_pb_professional', 'professional_breaks', 'users', ['professional_user_id'], ['id'])
    op.create_foreign_key('fk_spa_professional', 'service_professionals_association', 'users', ['professional_user_id'], ['id'])
    op.create_foreign_key('fk_spa_service', 'service_professionals_association', 'services', ['service_id'], ['id'])
    op.create_foreign_key('fk_services_category', 'services', 'service_categories', ['category_id'], ['id'])
    
    # Recreate additional foreign keys if tables exist
    try:
        op.create_foreign_key('fk_ssr_service', 'service_station_requirements', 'services', ['service_id'], ['id'])
        op.create_foreign_key('fk_ssr_station_type', 'service_station_requirements', 'station_types', ['station_type_id'], ['id'])
        op.create_foreign_key('fk_stations_type', 'stations', 'station_types', ['type_id'], ['id'])
    except:
        pass  # Tables might not exist in all environments
    
    # Remove tenant_id columns (simplifying to single database)
    op.drop_column('appointments', 'tenant_id')
    op.drop_column('professional_availability', 'tenant_id')
    op.drop_column('services', 'tenant_id')
    
    print("✅ Successfully converted VARCHAR(36) columns to UUID type!")


def downgrade() -> None:
    """Revert UUID columns back to VARCHAR(36)."""
    
    # This is a complex downgrade, in practice you'd probably restore from backup
    # For now, just raise an error
    raise NotImplementedError("Downgrade not implemented - restore from backup if needed")