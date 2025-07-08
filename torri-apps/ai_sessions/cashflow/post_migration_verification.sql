-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- 
-- Run this script to verify that the payment_headers migration was successful
-- Check this for all schemas: dev, prod, miria_maison
--
-- ============================================================================

-- Check dev schema
SET search_path TO dev;
SELECT 'DEV SCHEMA VERIFICATION' as schema_check;

-- 1. Verify payment_headers table exists
SELECT 'payment_headers table exists: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_headers' AND table_schema = 'dev') as check_result;

-- 2. Verify payments table no longer exists
SELECT 'payments table removed: ' || NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'dev') as check_result;

-- 3. Verify payment_headers structure (should include account_id)
SELECT 'payment_headers columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_headers' AND table_schema = 'dev'
ORDER BY ordinal_position;

-- 4. Verify payment_items has payment_header_id column
SELECT 'payment_items has payment_header_id: ' || EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_items' AND column_name = 'payment_header_id' AND table_schema = 'dev') as check_result;

-- 5. Verify payment_items no longer has payment_id column
SELECT 'payment_items payment_id removed: ' || NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_items' AND column_name = 'payment_id' AND table_schema = 'dev') as check_result;

-- 6. Verify indexes on payment_headers
SELECT 'payment_headers indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payment_headers' AND schemaname = 'dev';

-- 7. Verify foreign key constraints
SELECT 'payment_headers foreign keys:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'dev.payment_headers'::regclass;

-- 8. Verify payment_items foreign keys
SELECT 'payment_items foreign keys:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'dev.payment_items'::regclass;

-- 9. Count records
SELECT 'Record counts:' as info;
SELECT 
    'payment_headers: ' || COUNT(*) as count_result
FROM payment_headers;

-- ============================================================================

-- Check prod schema
SET search_path TO prod;
SELECT 'PROD SCHEMA VERIFICATION' as schema_check;

-- 1. Verify payment_headers table exists
SELECT 'payment_headers table exists: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_headers' AND table_schema = 'prod') as check_result;

-- 2. Verify payments table no longer exists
SELECT 'payments table removed: ' || NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'prod') as check_result;

-- 3. Verify payment_headers structure (should include account_id)
SELECT 'payment_headers columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_headers' AND table_schema = 'prod'
ORDER BY ordinal_position;

-- 4. Verify payment_items has payment_header_id column
SELECT 'payment_items has payment_header_id: ' || EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_items' AND column_name = 'payment_header_id' AND table_schema = 'prod') as check_result;

-- 5. Verify indexes on payment_headers
SELECT 'payment_headers indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payment_headers' AND schemaname = 'prod';

-- 6. Count records
SELECT 'Record counts:' as info;
SELECT 
    'payment_headers: ' || COUNT(*) as count_result
FROM payment_headers;

-- ============================================================================

-- Check miria_maison schema
SET search_path TO miria_maison;
SELECT 'MIRIA_MAISON SCHEMA VERIFICATION' as schema_check;

-- 1. Verify payment_headers table exists
SELECT 'payment_headers table exists: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_headers' AND table_schema = 'miria_maison') as check_result;

-- 2. Verify payments table no longer exists
SELECT 'payments table removed: ' || NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'miria_maison') as check_result;

-- 3. Verify payment_headers structure (should include account_id)
SELECT 'payment_headers columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_headers' AND table_schema = 'miria_maison'
ORDER BY ordinal_position;

-- 4. Verify payment_items has payment_header_id column
SELECT 'payment_items has payment_header_id: ' || EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_items' AND column_name = 'payment_header_id' AND table_schema = 'miria_maison') as check_result;

-- 5. Verify indexes on payment_headers
SELECT 'payment_headers indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payment_headers' AND schemaname = 'miria_maison';

-- 6. Count records
SELECT 'Record counts:' as info;
SELECT 
    'payment_headers: ' || COUNT(*) as count_result
FROM payment_headers;

-- ============================================================================
-- SUMMARY CHECK
-- ============================================================================

-- Quick summary across all schemas
SELECT 'MIGRATION SUMMARY' as summary;

SELECT 
    'dev payment_headers: ' || (SELECT COUNT(*) FROM dev.payment_headers) ||
    ', prod payment_headers: ' || (SELECT COUNT(*) FROM prod.payment_headers) ||
    ', miria_maison payment_headers: ' || (SELECT COUNT(*) FROM miria_maison.payment_headers) as record_counts;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Expected Results:
-- 1. payment_headers table should exist in all schemas
-- 2. payments table should no longer exist in any schema
-- 3. payment_headers should have account_id column
-- 4. payment_items should have payment_header_id instead of payment_id
-- 5. All indexes should be recreated with new names
-- 6. Record counts should match what you had before migration
--
-- ============================================================================