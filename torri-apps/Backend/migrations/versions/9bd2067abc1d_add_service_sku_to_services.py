"""add_service_sku_to_services

Revision ID: 9bd2067abc1d
Revises: add_cpf_and_address
Create Date: 2025-07-01 00:36:05.710265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9bd2067abc1d'
down_revision: Union[str, None] = 'add_cpf_and_address'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('services', sa.Column('service_sku', sa.String(length=10), nullable=True))
    # Update existing NULL values to be unique before adding the unique constraint
    # Generate a unique 10-character SKU using MD5 hash of a random UUID
    op.execute("UPDATE services SET service_sku = LEFT(MD5(CAST(gen_random_uuid() AS TEXT)), 10) WHERE service_sku IS NULL")
    op.create_unique_constraint('uq_services_service_sku', 'services', ['service_sku'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_services_service_sku', 'services', type_='unique')
    op.drop_column('services', 'service_sku')
