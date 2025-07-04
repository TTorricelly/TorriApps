"""Add image system improvements

Revision ID: add_image_system_improvements
Revises: migration_manual
Create Date: 2025-01-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_image_system_improvements'
down_revision = 'migration_manual'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for better performance
    op.create_index('idx_service_images_service_id_display_order', 'service_images', ['service_id', 'display_order'])
    op.create_index('idx_service_images_is_primary', 'service_images', ['is_primary'])
    op.create_index('idx_service_images_created_at', 'service_images', ['created_at'])
    
    op.create_index('idx_service_image_labels_image_id', 'service_image_labels', ['image_id'])
    op.create_index('idx_service_image_labels_label_id', 'service_image_labels', ['label_id'])


def downgrade():
    # Remove indexes
    op.drop_index('idx_service_image_labels_label_id', 'service_image_labels')
    op.drop_index('idx_service_image_labels_image_id', 'service_image_labels')
    
    op.drop_index('idx_service_images_created_at', 'service_images')
    op.drop_index('idx_service_images_is_primary', 'service_images')
    op.drop_index('idx_service_images_service_id_display_order', 'service_images')