"""remove_additional_cross_schema_foreign_keys

Revision ID: 1081fede8663
Revises: e0880b246eb7
Create Date: 2025-06-02 23:49:26.591354

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1081fede8663'
down_revision: Union[str, None] = 'e0880b246eb7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove additional cross-schema foreign key constraints for multi-tenant isolation."""
    # Drop foreign key constraints that reference the public schema from various models
    
    try:
        # Appointments model cross-schema FK
        op.drop_constraint('appointments_ibfk_1', 'appointments', type_='foreignkey')
    except Exception:
        pass
    
    try:
        # Professional Availability model cross-schema FK
        op.drop_constraint('professional_availabilities_ibfk_1', 'professional_availabilities', type_='foreignkey')
    except Exception:
        pass
    
    try:
        # Professional Break model cross-schema FK
        op.drop_constraint('professional_breaks_ibfk_1', 'professional_breaks', type_='foreignkey')
    except Exception:
        pass
    
    try:
        # Professional Blocked Time model cross-schema FK
        op.drop_constraint('professional_blocked_times_ibfk_1', 'professional_blocked_times', type_='foreignkey')
    except Exception:
        pass


def downgrade() -> None:
    """Recreate cross-schema foreign key constraints (not recommended for multi-tenant)."""
    # Note: This downgrade would recreate the problematic cross-schema FKs
    # In production, these should remain removed for proper multi-tenant isolation
    pass
