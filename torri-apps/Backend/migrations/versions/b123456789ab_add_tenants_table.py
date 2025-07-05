"""Add tenants table for multi-tenant support

Revision ID: b123456789ab
Revises: acc597979661
Create Date: 2025-06-29 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b123456789ab'
down_revision = '43669d80b6a3'
branch_labels = None
depends_on = None


def upgrade():
    """Create tenants table in public schema."""
    
    # Create tenants table in public schema
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False, comment='Display name of the tenant'),
        sa.Column('slug', sa.String(length=50), nullable=False, comment='URL-safe identifier for the tenant'),
        sa.Column('db_schema_name', sa.String(length=63), nullable=False, comment='PostgreSQL schema name for this tenant'),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('max_users', sa.Integer(), nullable=False, comment='Maximum number of users allowed for this tenant'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema='public'
    )
    
    # Create indexes
    op.create_index('ix_tenants_slug', 'tenants', ['slug'], unique=True, schema='public')
    op.create_index('ix_tenants_db_schema_name', 'tenants', ['db_schema_name'], unique=True, schema='public')
    
    # Add default tenant for existing data (optional - can be removed if not needed)
    op.execute("""
        INSERT INTO public.tenants (id, name, slug, db_schema_name, is_active, max_users, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Default Tenant',
            'default',
            'public',
            true,
            100,
            NOW(),
            NOW()
        );
    """)


def downgrade():
    """Drop tenants table."""
    op.drop_index('ix_tenants_db_schema_name', table_name='tenants', schema='public')
    op.drop_index('ix_tenants_slug', table_name='tenants', schema='public')
    op.drop_table('tenants', schema='public')