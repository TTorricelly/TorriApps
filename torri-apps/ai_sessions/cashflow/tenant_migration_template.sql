-- ============================================================================
-- TENANT-SPECIFIC PAYMENT HEADERS MIGRATION
-- ============================================================================
-- 
-- Replace {SCHEMA_NAME} with your actual schema name (dev, prod, miria_maison, etc.)
-- Run this for each tenant schema separately
--
-- Example usage:
-- For dev schema: SET search_path TO dev; then run the migration
-- For prod schema: SET search_path TO prod; then run the migration
-- For miria_maison schema: SET search_path TO miria_maison; then run the migration
--
-- ============================================================================

-- REPLACE THIS WITH YOUR ACTUAL SCHEMA NAME
SET search_path TO {SCHEMA_NAME};

-- Verify we're in the correct schema
SELECT current_schema() as current_schema;

-- ============================================================================
-- MIGRATION STARTS HERE
-- ============================================================================

BEGIN;

-- Step 1: Drop existing foreign key constraints on payment_items
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
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

-- Step 2: Rename the payments table to payment_headers
ALTER TABLE payments RENAME TO payment_headers;

-- Step 3: Add account_id field to payment_headers
ALTER TABLE payment_headers 
ADD COLUMN account_id VARCHAR(36);

-- Step 4: Add foreign key constraint to accounts table (if accounts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = current_schema()) THEN
        ALTER TABLE payment_headers 
        ADD CONSTRAINT fk_payment_headers_account 
        FOREIGN KEY (account_id) REFERENCES accounts(id);
        RAISE NOTICE 'Added foreign key constraint to accounts table';
    ELSE
        RAISE NOTICE 'Accounts table does not exist in schema %, skipping foreign key constraint', current_schema();
    END IF;
END $$;

-- Step 5: Add index on account_id for performance
CREATE INDEX ix_payment_headers_account_id ON payment_headers(account_id);

-- Step 6: Update payment_items table to reference payment_headers
ALTER TABLE payment_items 
RENAME COLUMN payment_id TO payment_header_id;

-- Step 7: Recreate the foreign key constraint from payment_items to payment_headers
ALTER TABLE payment_items 
ADD CONSTRAINT fk_payment_items_payment_header 
FOREIGN KEY (payment_header_id) REFERENCES payment_headers(id);

-- Step 8: Handle indexes based on your current structure
-- The primary key (payments_pkey) will be automatically renamed to payment_headers_pkey

-- Recreate the unique constraint on payment_id (was payments_payment_id_key)
-- Only create if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_headers_payment_id_key') THEN
        ALTER TABLE payment_headers ADD CONSTRAINT payment_headers_payment_id_key UNIQUE (payment_id);
        RAISE NOTICE 'Created unique constraint on payment_id';
    END IF;
END $$;

-- Recreate the index on payment_id (was ix_payments_payment_id)
DROP INDEX IF EXISTS ix_payments_payment_id;
CREATE INDEX ix_payment_headers_payment_id ON payment_headers(payment_id);

-- Update payment_items indexes
DROP INDEX IF EXISTS ix_payment_items_payment_id;
CREATE INDEX ix_payment_items_payment_header_id ON payment_items(payment_header_id);

-- Create additional useful indexes
CREATE INDEX IF NOT EXISTS ix_payment_headers_client_id ON payment_headers(client_id);
CREATE INDEX IF NOT EXISTS ix_payment_headers_created_at ON payment_headers(created_at);
CREATE INDEX IF NOT EXISTS ix_payment_headers_payment_status ON payment_headers(payment_status);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify current schema
SELECT 'Current schema: ' || current_schema() as info;

-- Verify table exists
SELECT 'payment_headers table exists: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_headers' AND table_schema = current_schema()) as info;

-- Verify structure
SELECT 'payment_headers columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_headers' AND table_schema = current_schema()
ORDER BY ordinal_position;

-- Verify indexes
SELECT 'payment_headers indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payment_headers' AND schemaname = current_schema();

-- Verify constraints
SELECT 'payment_headers constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (current_schema() || '.payment_headers')::regclass;

-- Verify data count
SELECT 'Record count: ' || COUNT(*) || ' payment_headers' as info FROM payment_headers;

-- ============================================================================
-- EXAMPLE USAGE FOR EACH SCHEMA
-- ============================================================================

/*
-- For dev schema:
SET search_path TO dev;
-- Then run the migration above

-- For prod schema:
SET search_path TO prod;
-- Then run the migration above

-- For miria_maison schema:
SET search_path TO miria_maison;
-- Then run the migration above
*/

-- ============================================================================
-- ROLLBACK TEMPLATE (customize for your schema)
-- ============================================================================

/*
-- ROLLBACK FOR SPECIFIC SCHEMA
-- Replace {SCHEMA_NAME} with your actual schema name

SET search_path TO {SCHEMA_NAME};

BEGIN;

-- Drop new constraints
ALTER TABLE payment_headers DROP CONSTRAINT IF EXISTS fk_payment_headers_account;
ALTER TABLE payment_headers DROP CONSTRAINT IF EXISTS payment_headers_payment_id_key;
ALTER TABLE payment_items DROP CONSTRAINT IF EXISTS fk_payment_items_payment_header;

-- Remove account_id column
ALTER TABLE payment_headers DROP COLUMN IF EXISTS account_id;

-- Rename back to payments
ALTER TABLE payment_headers RENAME TO payments;

-- Rename payment_items column back
ALTER TABLE payment_items RENAME COLUMN payment_header_id TO payment_id;

-- Recreate original constraints and indexes
ALTER TABLE payments ADD CONSTRAINT payments_payment_id_key UNIQUE (payment_id);
ALTER TABLE payment_items ADD CONSTRAINT payment_items_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id);

-- Recreate original indexes
CREATE INDEX ix_payments_payment_id ON payments(payment_id);
CREATE INDEX ix_payment_items_payment_id ON payment_items(payment_id);

-- Drop new indexes
DROP INDEX IF EXISTS ix_payment_headers_account_id;
DROP INDEX IF EXISTS ix_payment_headers_payment_id;
DROP INDEX IF EXISTS ix_payment_items_payment_header_id;

COMMIT;
*/