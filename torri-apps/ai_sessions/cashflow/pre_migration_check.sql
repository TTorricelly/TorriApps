-- ============================================================================
-- PRE-MIGRATION CHECKS
-- ============================================================================
-- 
-- Run these queries BEFORE the migration to understand current structure
-- and dependencies. This will help identify any issues.
--
-- ============================================================================

-- 1. Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- 2. Check all indexes on payments table
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'payments';

-- 3. Check all foreign key constraints referencing payments table
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE confrelid = 'payments'::regclass;

-- 4. Check all foreign key constraints FROM payments table
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass AND contype = 'f';

-- 5. Check payment_items table structure and constraints
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_items' 
ORDER BY ordinal_position;

-- 6. Check payment_items foreign key constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payment_items'::regclass AND contype = 'f';

-- 7. Check if accounts table exists (needed for new foreign key)
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'accounts'
) as accounts_table_exists;

-- 8. Count existing records
SELECT 
    (SELECT COUNT(*) FROM payments) as payment_count,
    (SELECT COUNT(*) FROM payment_items) as payment_items_count;

-- ============================================================================
-- NOTES:
-- - Run these queries to understand current structure
-- - Save the output before running the migration
-- - This will help troubleshoot if something goes wrong
-- ============================================================================