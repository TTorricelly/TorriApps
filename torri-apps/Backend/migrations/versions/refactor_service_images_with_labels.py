"""Refactor service images to support multiple images with labels

Revision ID: refactor_service_images_with_labels
Revises: add_labels_table
Create Date: 2025-07-02 14:00:00.000000

This migration:
1. Creates service_images table for unlimited image uploads
2. Creates service_image_labels junction table for flexible labeling
3. Migrates existing image URLs to new system (if any exist)
4. Removes old static image fields from services table

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'refactor_service_images_with_labels'
down_revision: Union[str, None] = 'add_labels_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add new image tables and migrate data."""
    
    # Step 1: Create service_images table
    op.execute("""
        DO $$ 
        BEGIN 
            -- Create service_images table if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_name = 'service_images') THEN
                CREATE TABLE service_images (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
                    uploaded_by UUID REFERENCES users(id),
                    filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    file_size INTEGER NOT NULL,
                    content_type VARCHAR(100) NOT NULL,
                    alt_text TEXT,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            END IF;
            
            -- Create indexes for service_images
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_images' AND indexname = 'ix_service_images_service_id') THEN
                CREATE INDEX ix_service_images_service_id ON service_images (service_id);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_images' AND indexname = 'ix_service_images_display_order') THEN
                CREATE INDEX ix_service_images_display_order ON service_images (display_order);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_images' AND indexname = 'ix_service_images_is_primary') THEN
                CREATE INDEX ix_service_images_is_primary ON service_images (is_primary);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_images' AND indexname = 'ix_service_images_created_at') THEN
                CREATE INDEX ix_service_images_created_at ON service_images (created_at);
            END IF;
            
        END $$;
    """)
    
    # Step 2: Create service_image_labels junction table
    op.execute("""
        DO $$ 
        BEGIN 
            -- Create service_image_labels table if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_name = 'service_image_labels') THEN
                CREATE TABLE service_image_labels (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    image_id UUID NOT NULL REFERENCES service_images(id) ON DELETE CASCADE,
                    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            END IF;
            
            -- Create unique constraint to prevent duplicate label assignments
            IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                          WHERE conname = 'uq_service_image_label') THEN
                ALTER TABLE service_image_labels 
                ADD CONSTRAINT uq_service_image_label UNIQUE (image_id, label_id);
            END IF;
            
            -- Create indexes for service_image_labels
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_image_labels' AND indexname = 'ix_service_image_labels_image_id') THEN
                CREATE INDEX ix_service_image_labels_image_id ON service_image_labels (image_id);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                          WHERE tablename = 'service_image_labels' AND indexname = 'ix_service_image_labels_label_id') THEN
                CREATE INDEX ix_service_image_labels_label_id ON service_image_labels (label_id);
            END IF;
            
        END $$;
    """)
    
    # Step 3: Create trigger for updated_at on service_images
    op.execute("""
        DO $$ 
        BEGIN 
            -- Create trigger for service_images updated_at if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                          WHERE trigger_name = 'update_service_images_updated_at' AND table_name = 'service_images') THEN
                CREATE TRIGGER update_service_images_updated_at
                    BEFORE UPDATE ON service_images
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            END IF;
            
        END $$;
    """)
    
    # Step 4: Migrate existing image data (if any)
    op.execute("""
        DO $$ 
        DECLARE
            service_record RECORD;
            image_id UUID;
        BEGIN 
            -- Migrate existing image URLs to new system
            FOR service_record IN 
                SELECT id, image, image_liso, image_ondulado, image_cacheado, image_crespo 
                FROM services 
                WHERE image IS NOT NULL 
                   OR image_liso IS NOT NULL 
                   OR image_ondulado IS NOT NULL 
                   OR image_cacheado IS NOT NULL 
                   OR image_crespo IS NOT NULL
            LOOP
                -- Migrate general image
                IF service_record.image IS NOT NULL AND service_record.image != '' THEN
                    INSERT INTO service_images (
                        service_id, filename, file_path, file_size, content_type, 
                        alt_text, display_order, is_primary
                    ) VALUES (
                        service_record.id,
                        'migrated_general_image.jpg',
                        service_record.image,
                        0, -- Unknown file size for migrated data
                        'image/jpeg', -- Assume JPEG for migrated data
                        'Migrated general service image',
                        0, -- First image
                        TRUE -- Primary image
                    );
                END IF;
                
                -- Migrate hair type images
                IF service_record.image_liso IS NOT NULL AND service_record.image_liso != '' THEN
                    INSERT INTO service_images (
                        service_id, filename, file_path, file_size, content_type, 
                        alt_text, display_order, is_primary
                    ) VALUES (
                        service_record.id,
                        'migrated_liso_image.jpg',
                        service_record.image_liso,
                        0,
                        'image/jpeg',
                        'Migrated straight hair image',
                        1,
                        FALSE
                    );
                END IF;
                
                IF service_record.image_ondulado IS NOT NULL AND service_record.image_ondulado != '' THEN
                    INSERT INTO service_images (
                        service_id, filename, file_path, file_size, content_type, 
                        alt_text, display_order, is_primary
                    ) VALUES (
                        service_record.id,
                        'migrated_ondulado_image.jpg',
                        service_record.image_ondulado,
                        0,
                        'image/jpeg',
                        'Migrated wavy hair image',
                        2,
                        FALSE
                    );
                END IF;
                
                IF service_record.image_cacheado IS NOT NULL AND service_record.image_cacheado != '' THEN
                    INSERT INTO service_images (
                        service_id, filename, file_path, file_size, content_type, 
                        alt_text, display_order, is_primary
                    ) VALUES (
                        service_record.id,
                        'migrated_cacheado_image.jpg',
                        service_record.image_cacheado,
                        0,
                        'image/jpeg',
                        'Migrated curly hair image',
                        3,
                        FALSE
                    );
                END IF;
                
                IF service_record.image_crespo IS NOT NULL AND service_record.image_crespo != '' THEN
                    INSERT INTO service_images (
                        service_id, filename, file_path, file_size, content_type, 
                        alt_text, display_order, is_primary
                    ) VALUES (
                        service_record.id,
                        'migrated_crespo_image.jpg',
                        service_record.image_crespo,
                        0,
                        'image/jpeg',
                        'Migrated coily hair image',
                        4,
                        FALSE
                    );
                END IF;
                
            END LOOP;
            
        END $$;
    """)
    
    # Step 5: Remove old image columns from services table
    op.execute("""
        DO $$ 
        BEGIN 
            -- Remove old image columns if they exist
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'services' AND column_name = 'image') THEN
                ALTER TABLE services DROP COLUMN image;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'services' AND column_name = 'image_liso') THEN
                ALTER TABLE services DROP COLUMN image_liso;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'services' AND column_name = 'image_ondulado') THEN
                ALTER TABLE services DROP COLUMN image_ondulado;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'services' AND column_name = 'image_cacheado') THEN
                ALTER TABLE services DROP COLUMN image_cacheado;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'services' AND column_name = 'image_crespo') THEN
                ALTER TABLE services DROP COLUMN image_crespo;
            END IF;
            
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema - Restore old image fields and remove new tables."""
    
    # Step 1: Re-add old image columns to services table
    op.execute("""
        DO $$ 
        BEGIN 
            -- Add back old image columns if they don't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'services' AND column_name = 'image') THEN
                ALTER TABLE services ADD COLUMN image VARCHAR(255);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'services' AND column_name = 'image_liso') THEN
                ALTER TABLE services ADD COLUMN image_liso VARCHAR(255);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'services' AND column_name = 'image_ondulado') THEN
                ALTER TABLE services ADD COLUMN image_ondulado VARCHAR(255);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'services' AND column_name = 'image_cacheado') THEN
                ALTER TABLE services ADD COLUMN image_cacheado VARCHAR(255);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'services' AND column_name = 'image_crespo') THEN
                ALTER TABLE services ADD COLUMN image_crespo VARCHAR(255);
            END IF;
            
        END $$;
    """)
    
    # Step 2: Migrate data back from new tables to old columns (best effort)
    op.execute("""
        DO $$ 
        DECLARE
            service_record RECORD;
        BEGIN 
            -- Migrate primary images back to general image field
            FOR service_record IN 
                SELECT DISTINCT si.service_id, si.file_path
                FROM service_images si
                WHERE si.is_primary = TRUE
            LOOP
                UPDATE services 
                SET image = service_record.file_path 
                WHERE id = service_record.service_id;
            END LOOP;
            
            -- Note: Hair type specific images cannot be reliably migrated back
            -- as the new system doesn't enforce the old hair type categorization
            
        END $$;
    """)
    
    # Step 3: Drop new tables
    op.execute("""
        DO $$ 
        BEGIN 
            -- Drop triggers if they exist
            IF EXISTS (SELECT 1 FROM information_schema.triggers 
                      WHERE trigger_name = 'update_service_images_updated_at' AND table_name = 'service_images') THEN
                DROP TRIGGER update_service_images_updated_at ON service_images;
            END IF;
            
            -- Drop tables if they exist (cascade will handle foreign keys)
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_name = 'service_image_labels') THEN
                DROP TABLE service_image_labels;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_name = 'service_images') THEN
                DROP TABLE service_images;
            END IF;
            
        END $$;
    """)