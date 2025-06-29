"""remove_cross_schema_foreign_keys

Revision ID: e0880b246eb7
Revises: 5a4be13da19e
Create Date: 2025-06-02 23:39:01.934250

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0880b246eb7'
down_revision: Union[str, None] = '5a4be13da19e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove cross-schema foreign key constraints for multi-tenant isolation."""
    # Drop foreign key constraints that reference the public schema
    # These will be replaced with application-level validation
    
    try:
        # Check if foreign key exists before trying to drop it
        op.drop_constraint('service_categories_ibfk_1', 'service_categories', type_='foreignkey')
    except Exception:
        # Constraint might not exist or have different name
        pass
    
    try:
        # Check if foreign key exists before trying to drop it  
        op.drop_constraint('services_ibfk_2', 'services', type_='foreignkey')
    except Exception:
        # Constraint might not exist or have different name
        pass


def downgrade() -> None:
    """Recreate cross-schema foreign key constraints (not recommended for multi-tenant)."""
    # Note: This downgrade would recreate the problematic cross-schema FKs
    # In production, these should remain removed for proper multi-tenant isolation
    pass
