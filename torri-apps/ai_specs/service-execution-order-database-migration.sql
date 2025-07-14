-- Service Execution Order & Compatibility Matrix Database Migration
-- This migration adds the necessary fields for service execution order and compatibility matrix

-- ========================================
-- 1. ADD MISSING AND NEW FIELDS TO SERVICES TABLE
-- ========================================

-- Add missing display_order column (exists in model but missing from DB)
ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add execution order fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS execution_order INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS execution_flexible BOOLEAN DEFAULT FALSE;

-- Add advanced timing fields (all in minutes, nullable)
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_time INTEGER DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS finishing_time INTEGER DEFAULT NULL; 
ALTER TABLE services ADD COLUMN IF NOT EXISTS transition_time INTEGER DEFAULT NULL;

-- Add processing behavior fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS allows_parallel_during_processing BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS can_be_done_during_processing BOOLEAN DEFAULT FALSE;

-- ========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Create indexes for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_services_execution_order ON services(execution_order);
CREATE INDEX IF NOT EXISTS idx_services_execution_flexible ON services(execution_flexible);

-- ========================================
-- 3. CREATE SERVICE COMPATIBILITY MATRIX TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS service_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_a_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    service_b_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Parallel execution compatibility
    can_run_parallel BOOLEAN NOT NULL DEFAULT FALSE,
    parallel_type VARCHAR(50) DEFAULT 'never', -- 'full_parallel', 'during_processing_only', 'never'
    
    -- Compatibility metadata
    reason VARCHAR(255), -- 'same_professional', 'workspace_conflict', 'chemical_conflict', 'positioning_conflict', 'equipment_conflict', 'safety_concern', 'business_rule'
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(service_a_id, service_b_id),
    CHECK (service_a_id != service_b_id), -- Service can't be compatible with itself
    CHECK (parallel_type IN ('full_parallel', 'during_processing_only', 'never'))
);

-- Create reverse lookup index for performance (bidirectional lookups)
CREATE INDEX IF NOT EXISTS idx_service_compatibility_reverse ON service_compatibility(service_b_id, service_a_id);
CREATE INDEX IF NOT EXISTS idx_service_compatibility_type ON service_compatibility(parallel_type);

-- ========================================
-- 4. UPDATE EXISTING SERVICES WITH DEFAULT VALUES
-- ========================================

-- Set default execution order based on current display_order
UPDATE services 
SET execution_order = COALESCE(display_order, 0)
WHERE execution_order = 0;

-- Set default display_order if it's missing
UPDATE services 
SET display_order = 0
WHERE display_order IS NULL;

-- ========================================
-- 5. CREATE TRIGGER FOR BIDIRECTIONAL COMPATIBILITY
-- ========================================

-- Function to ensure bidirectional compatibility consistency
CREATE OR REPLACE FUNCTION ensure_bidirectional_compatibility()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent infinite loop by checking if we're already processing the reverse
    IF EXISTS (
        SELECT 1 FROM service_compatibility 
        WHERE service_a_id = NEW.service_b_id 
        AND service_b_id = NEW.service_a_id
        AND updated_at = NEW.updated_at
    ) THEN
        RETURN NEW;
    END IF;
    
    -- When inserting or updating compatibility A->B, also ensure B->A exists
    INSERT INTO service_compatibility (
        service_a_id, 
        service_b_id, 
        can_run_parallel, 
        parallel_type, 
        reason,
        notes
    )
    VALUES (
        NEW.service_b_id, 
        NEW.service_a_id, 
        NEW.can_run_parallel, 
        NEW.parallel_type, 
        NEW.reason,
        NEW.notes
    )
    ON CONFLICT (service_a_id, service_b_id) 
    DO UPDATE SET
        can_run_parallel = NEW.can_run_parallel,
        parallel_type = NEW.parallel_type,
        reason = NEW.reason,
        notes = NEW.notes,
        updated_at = CURRENT_TIMESTAMP;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bidirectional compatibility
DROP TRIGGER IF EXISTS trigger_bidirectional_compatibility ON service_compatibility;
CREATE TRIGGER trigger_bidirectional_compatibility
    AFTER INSERT OR UPDATE ON service_compatibility
    FOR EACH ROW
    EXECUTE FUNCTION ensure_bidirectional_compatibility();

-- ========================================
-- 6. SAMPLE DATA FOR TESTING (OPTIONAL)
-- ========================================

-- You can uncomment these lines to insert sample compatibility data for testing

/*
-- Sample: Hair Cut cannot run parallel with Hair Coloring (same professional)
INSERT INTO service_compatibility (service_a_id, service_b_id, can_run_parallel, parallel_type, reason, notes)
SELECT 
    s1.id, s2.id, FALSE, 'never', 'same_professional', 
    'Both services require the same professional and workspace'
FROM services s1, services s2
WHERE s1.name ILIKE '%corte%' AND s2.name ILIKE '%coloração%'
AND s1.id != s2.id
ON CONFLICT (service_a_id, service_b_id) DO NOTHING;

-- Sample: Manicure can run during Hair Coloring processing time
INSERT INTO service_compatibility (service_a_id, service_b_id, can_run_parallel, parallel_type, reason, notes)
SELECT 
    s1.id, s2.id, TRUE, 'during_processing_only', 'different_body_areas',
    'Manicure can be done while hair color processes'
FROM services s1, services s2
WHERE s1.name ILIKE '%manicure%' AND s2.name ILIKE '%coloração%'
AND s1.id != s2.id
ON CONFLICT (service_a_id, service_b_id) DO NOTHING;
*/

-- ========================================
-- 7. VERIFICATION QUERIES
-- ========================================

-- Verify the new columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN (
    'display_order', 'execution_order', 'execution_flexible',
    'processing_time', 'finishing_time', 'transition_time',
    'allows_parallel_during_processing', 'can_be_done_during_processing'
)
ORDER BY column_name;

-- Verify compatibility table was created
SELECT COUNT(*) as compatibility_table_exists 
FROM information_schema.tables 
WHERE table_name = 'service_compatibility';

-- Check services with new fields
SELECT 
    id, name, display_order, execution_order, execution_flexible,
    processing_time, finishing_time, transition_time
FROM services 
ORDER BY execution_order, display_order
LIMIT 5;