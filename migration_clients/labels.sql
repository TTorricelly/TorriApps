SET search_path TO devs;
-- Service model fields to remove:
  image VARCHAR(255)              -- General image URL  
  image_liso VARCHAR(255)         -- Straight hair image URL
  image_ondulado VARCHAR(255)     -- Wavy hair image URL  
  image_cacheado VARCHAR(255)     -- Curly hair image URL
  image_crespo VARCHAR(255)       -- Coily hair image URL

  New Schema (to be created):

  -- 1. Service Images Table
  CREATE TABLE service_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,          -- Original filename
      file_path VARCHAR(500) NOT NULL,         -- Storage path/URL
      file_size INTEGER NOT NULL,              -- File size in bytes
      content_type VARCHAR(100) NOT NULL,      -- MIME type (image/jpeg, etc.)
      alt_text TEXT,                          -- Accessibility description
      display_order INTEGER DEFAULT 0,        -- Order for display
      is_primary BOOLEAN DEFAULT FALSE,       -- Primary/featured image
      uploaded_by UUID REFERENCES users(id),  -- Who uploaded
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),

      INDEX idx_service_images_service_id (service_id),
      INDEX idx_service_images_display_order (display_order),
      INDEX idx_service_images_is_primary (is_primary)
  );

  -- 2. Image-Labels Junction Table  
  CREATE TABLE service_image_labels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID NOT NULL REFERENCES service_images(id) ON DELETE CASCADE,
      label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),

      UNIQUE(image_id, label_id),  -- Prevent duplicate label assignments
      INDEX idx_image_labels_image_id (image_id),
      INDEX idx_image_labels_label_id (label_id)
  );
