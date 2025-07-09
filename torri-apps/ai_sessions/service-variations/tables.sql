-- Service Variations Tables Creation Script
-- Note: No tenant_id needed as each tenant has its own isolated schema

-- Create the service_variation_groups table
CREATE TABLE service_variation_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    service_id UUID NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_service_variation_groups_service_id 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT uq_service_variation_group_name 
        UNIQUE (service_id, name)
);

-- Create indexes for service_variation_groups
CREATE INDEX idx_service_variation_groups_service_id ON service_variation_groups(service_id);
CREATE INDEX idx_service_variation_groups_created_at ON service_variation_groups(created_at);

-- Create the service_variations table
CREATE TABLE service_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duration_delta INTEGER NOT NULL DEFAULT 0,
    service_variation_group_id UUID NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_service_variations_group_id 
        FOREIGN KEY (service_variation_group_id) REFERENCES service_variation_groups(id) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT uq_service_variation_name 
        UNIQUE (service_variation_group_id, name)
);

-- Create indexes for service_variations
CREATE INDEX idx_service_variations_group_id ON service_variations(service_variation_group_id);
CREATE INDEX idx_service_variations_created_at ON service_variations(created_at);

set search_path to miria_maison;
 -- Add to migrations
  ALTER TABLE service_variations ADD COLUMN display_order INTEGER DEFAULT 0;
  CREATE INDEX idx_service_variations_order ON service_variations(service_variation_group_id, display_order);

-- Example data insertion (optional)
/*
-- Insert example variation group
INSERT INTO service_variation_groups (name, service_id) 
VALUES ('Hair Length', '{{service_uuid}}');

-- Insert example variations
INSERT INTO service_variations (name, price_delta, duration_delta, service_variation_group_id) 
VALUES 
    ('Short Hair', 0.00, 0, '{{variation_group_uuid}}'),
    ('Long Hair', 5.00, 15, '{{variation_group_uuid}}'),
    ('Extra Long Hair', 10.00, 30, '{{variation_group_uuid}}');
*/