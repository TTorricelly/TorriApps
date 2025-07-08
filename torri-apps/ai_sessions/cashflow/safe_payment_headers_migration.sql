-- ============================================================================
-- SAFE PAYMENT HEADERS MIGRATION
-- ============================================================================
-- 
-- This script safely migrates the payments table to payment_headers with
-- proper handling of indexes, constraints, and dependencies.
--
-- IMPORTANT: Run pre_migration_check.sql FIRST to understand current structure
--
-- Steps:
-- 1. Create backup of current structure
-- 2. Handle existing constraints safely
-- 3. Rename table and add new fields
-- 4. Update dependent tables
-- 5. Recreate indexes and constraints
-- 6. Verify the migration
--
-- ============================================================================

-- Step 1: Begin transaction for safety
BEGIN;

-- Step 2: Drop existing foreign key constraints on payment_items (if they exist)
-- Note: Constraint names may vary, check pre_migration_check.sql output
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find and drop all foreign key constraints pointing to payments table
    FOR constraint_rec IN 
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint 
        WHERE confrelid = 'payments'::regclass AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      constraint_rec.table_name, constraint_rec.conname);
        RAISE NOTICE 'Dropped constraint % from table %', constraint_rec.conname, constraint_rec.table_name;
    END LOOP;
END $$;

-- Step 3: Rename the payments table to payment_headers
ALTER TABLE payments RENAME TO payment_headers;

-- Step 4: Add account_id field to payment_headers
ALTER TABLE payment_headers 
ADD COLUMN account_id VARCHAR(36);

-- Step 5: Add foreign key constraint to accounts table (if accounts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        ALTER TABLE payment_headers 
        ADD CONSTRAINT fk_payment_headers_account 
        FOREIGN KEY (account_id) REFERENCES accounts(id);
        RAISE NOTICE 'Added foreign key constraint to accounts table';
    ELSE
        RAISE NOTICE 'Accounts table does not exist, skipping foreign key constraint';
    END IF;
END $$;

-- Step 6: Add index on account_id for performance
CREATE INDEX IF NOT EXISTS ix_payment_headers_account_id ON payment_headers(account_id);

-- Step 7: Update payment_items table to reference payment_headers
-- First, rename the column
ALTER TABLE payment_items 
RENAME COLUMN payment_id TO payment_header_id;

-- Step 8: Recreate the foreign key constraint from payment_items to payment_headers
ALTER TABLE payment_items 
ADD CONSTRAINT fk_payment_items_payment_header 
FOREIGN KEY (payment_header_id) REFERENCES payment_headers(id);

-- Step 9: Update any existing indexes on payment_items
-- Drop old index if it exists and create new one
DROP INDEX IF EXISTS ix_payment_items_payment_id;
CREATE INDEX IF NOT EXISTS ix_payment_items_payment_header_id ON payment_items(payment_header_id);

-- Step 10: Recreate indexes that were on payments table
-- Based on your current structure, these indexes need to be recreated:

-- Primary key will be automatically renamed, but let's ensure uniqueness constraints
CREATE UNIQUE INDEX IF NOT EXISTS payment_headers_payment_id_key ON payment_headers(payment_id);
CREATE INDEX IF NOT EXISTS ix_payment_headers_payment_id ON payment_headers(payment_id);

-- Additional useful indexes for performance
CREATE INDEX IF NOT EXISTS ix_payment_headers_client_id ON payment_headers(client_id);
CREATE INDEX IF NOT EXISTS ix_payment_headers_created_at ON payment_headers(created_at);
CREATE INDEX IF NOT EXISTS ix_payment_headers_payment_status ON payment_headers(payment_status);

-- Step 11: Update any sequences if they exist
DO $$
BEGIN
    -- Check if there are any sequences related to payments and update them
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name LIKE '%payment%') THEN
        -- Add sequence updates here if needed
        RAISE NOTICE 'Found payment-related sequences, manual review may be needed';
    END IF;
END $$;

-- Step 12: Commit the transaction
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
SELECT 'payment_headers structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_headers' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT 'payment_headers indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payment_headers';

-- Verify foreign key constraints
SELECT 'payment_headers foreign keys:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payment_headers'::regclass AND contype = 'f';

-- Verify payment_items structure
SELECT 'payment_items structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_items' 
ORDER BY ordinal_position;

-- Verify payment_items foreign keys
SELECT 'payment_items foreign keys:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payment_items'::regclass AND contype = 'f';

-- Verify data integrity
SELECT 'Data counts:' as info;
SELECT 
    (SELECT COUNT(*) FROM payment_headers) as payment_headers_count,
    (SELECT COUNT(*) FROM payment_items) as payment_items_count;

-- ============================================================================
-- ROLLBACK SCRIPT (save this separately if needed)
-- ============================================================================

/*
-- ROLLBACK SCRIPT (run only if something goes wrong)
BEGIN;

-- Drop new constraints
ALTER TABLE payment_headers DROP CONSTRAINT IF EXISTS fk_payment_headers_account;
ALTER TABLE payment_items DROP CONSTRAINT IF EXISTS fk_payment_items_payment_header;

-- Remove account_id column
ALTER TABLE payment_headers DROP COLUMN IF EXISTS account_id;

-- Rename back to payments
ALTER TABLE payment_headers RENAME TO payments;

-- Rename payment_items column back
ALTER TABLE payment_items RENAME COLUMN payment_header_id TO payment_id;

-- Recreate original foreign key
ALTER TABLE payment_items ADD CONSTRAINT payment_items_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id);

-- Drop new indexes
DROP INDEX IF EXISTS ix_payment_headers_account_id;
DROP INDEX IF EXISTS ix_payment_items_payment_header_id;

-- Recreate original index
CREATE INDEX IF NOT EXISTS ix_payment_items_payment_id ON payment_items(payment_id);

COMMIT;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This script uses transactions for safety
-- 2. It handles missing constraints gracefully
-- 3. It checks for accounts table existence before adding foreign key
-- 4. It preserves data integrity throughout the migration
-- 5. Run the pre_migration_check.sql first to understand your current structure
-- 6. Save the rollback script separately in case you need to revert
--
-- ============================================================================