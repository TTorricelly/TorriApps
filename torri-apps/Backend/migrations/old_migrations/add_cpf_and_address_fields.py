"""Add CPF and address fields to users table

Revision ID: add_cpf_and_address
Revises: 8285db59cac3
Create Date: 2025-06-30 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_cpf_and_address'
down_revision: Union[str, None] = '8285db59cac3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CPF and address fields to users table."""
    
    # Add CPF field
    op.add_column('users', sa.Column('cpf', sa.String(length=14), nullable=True))
    op.create_index('ix_users_cpf', 'users', ['cpf'])
    
    # Add address fields
    op.add_column('users', sa.Column('address_street', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('address_number', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('address_complement', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('address_neighborhood', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('address_city', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('address_state', sa.String(length=2), nullable=True))
    op.add_column('users', sa.Column('address_cep', sa.String(length=9), nullable=True))
    
    # Create index for CEP for potential geographical queries
    op.create_index('ix_users_address_cep', 'users', ['address_cep'])
    op.create_index('ix_users_address_city', 'users', ['address_city'])
    op.create_index('ix_users_address_state', 'users', ['address_state'])


def downgrade() -> None:
    """Remove CPF and address fields from users table."""
    
    # Drop indexes
    op.drop_index('ix_users_address_state', 'users')
    op.drop_index('ix_users_address_city', 'users')
    op.drop_index('ix_users_address_cep', 'users')
    op.drop_index('ix_users_cpf', 'users')
    
    # Drop columns
    op.drop_column('users', 'address_cep')
    op.drop_column('users', 'address_state')
    op.drop_column('users', 'address_city')
    op.drop_column('users', 'address_neighborhood')
    op.drop_column('users', 'address_complement')
    op.drop_column('users', 'address_number')
    op.drop_column('users', 'address_street')
    op.drop_column('users', 'cpf')