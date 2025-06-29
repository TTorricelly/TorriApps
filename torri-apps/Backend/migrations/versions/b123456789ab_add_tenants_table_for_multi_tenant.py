"""Add tenants table for multi-tenant support

Revision ID: b123456789ab
Revises: acc597979661
Create Date: 2025-06-29 03:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b123456789ab'
down_revision: Union[str, None] = 'acc597979661'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tenants table for multi-tenant support."""
    op.create_table(
        'tenants',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('db_schema_name', sa.String(100), nullable=False),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # Create indexes
    op.create_index('ix_tenants_id', 'tenants', ['id'])
    op.create_index('ix_tenants_name', 'tenants', ['name'])
    op.create_index('ix_tenants_slug', 'tenants', ['slug'])
    op.create_index('ix_tenants_db_schema_name', 'tenants', ['db_schema_name'])
    
    # Create unique constraints
    op.create_unique_constraint('uq_tenants_slug', 'tenants', ['slug'])
    op.create_unique_constraint('uq_tenants_db_schema_name', 'tenants', ['db_schema_name'])


def downgrade() -> None:
    """Remove tenants table."""
    op.drop_table('tenants')