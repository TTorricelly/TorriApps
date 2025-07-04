 SET search_path TO prod;

 CREATE TABLE prod.service_image_labels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID NOT NULL REFERENCES service_images(id) ON DELETE CASCADE,
      label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_service_image_label UNIQUE (image_id, label_id)
  );

  -- Create indexes for better performance
  CREATE INDEX idx_service_image_labels_image_id ON prod.service_image_labels (image_id);
  CREATE INDEX idx_service_image_labels_label_id ON prod.service_image_labels (label_id);

  ALTER TABLE prod.service_images DROP COLUMN IF EXISTS uploaded_by