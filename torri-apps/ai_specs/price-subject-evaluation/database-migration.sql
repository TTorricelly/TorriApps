-- Database Migration Script
-- Feature: Price Subject to Evaluation
-- Description: Adds boolean field to services and service_variations tables

-- =============================================================================
-- MIGRATION: Add price_subject_to_evaluation columns
-- =============================================================================

-- Add column to services table
ALTER TABLE miria_maison.services 
ADD COLUMN price_subject_to_evaluation BOOLEAN DEFAULT FALSE NOT NULL;

-- Add column to service_variations table  
ALTER TABLE miria_maison.service_variations 
ADD COLUMN price_subject_to_evaluation BOOLEAN DEFAULT FALSE NOT NULL;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'miria_maison' 
AND table_name = 'services' 
AND column_name = 'price_subject_to_evaluation';

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'miria_maison' 
AND table_name = 'service_variations' 
AND column_name = 'price_subject_to_evaluation';

-- Check existing data (should all be FALSE by default)
SELECT COUNT(*) as total_services,
       SUM(CASE WHEN price_subject_to_evaluation = TRUE THEN 1 ELSE 0 END) as evaluation_required
FROM miria_maison.services;

SELECT COUNT(*) as total_variations,
       SUM(CASE WHEN price_subject_to_evaluation = TRUE THEN 1 ELSE 0 END) as evaluation_required
FROM miria_maison.service_variations;

-- =============================================================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================================================

-- Uncomment the following lines if you need to rollback this migration:
-- ALTER TABLE miria_maison.services DROP COLUMN price_subject_to_evaluation;
-- ALTER TABLE miria_maison.service_variations DROP COLUMN price_subject_to_evaluation;

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. All existing services and variations will have price_subject_to_evaluation = FALSE
-- 2. The column is NOT NULL with a default value for data integrity
-- 3. This migration is backward compatible - existing code will continue to work
-- 4. The rollback script is provided for emergency situations
-- 5. Test this migration in a staging environment first
-- 6. Consider backing up the database before applying in production