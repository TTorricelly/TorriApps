-- ============================================================================
-- PAYMENT HEADERS MIGRATION
-- ============================================================================
-- 
-- This script migrates the payments table to payment_headers and adds 
-- the account_id field for accounting integration.
--
-- Steps:
-- 1. Rename payments table to payment_headers
-- 2. Add account_id field with foreign key to accounts table
-- 3. Update payment_items to reference payment_headers
-- 4. Update indexes and constraints
--
-- Run this migration for each tenant schema
-- ============================================================================

-- Step 1: Rename the payments table to payment_headers
ALTER TABLE payments RENAME TO payment_headers;

-- Step 2: Add account_id field to payment_headers
ALTER TABLE payment_headers 
ADD COLUMN account_id VARCHAR(36);

-- Step 3: Add foreign key constraint to accounts table
ALTER TABLE payment_headers 
ADD CONSTRAINT fk_payment_headers_account 
FOREIGN KEY (account_id) REFERENCES accounts(id);

-- Step 4: Add index on account_id for performance
CREATE INDEX ix_payment_headers_account_id ON payment_headers(account_id);

-- Step 5: Update payment_items table to reference payment_headers
ALTER TABLE payment_items 
RENAME COLUMN payment_id TO payment_header_id;

-- Step 6: Update foreign key constraint in payment_items
ALTER TABLE payment_items 
DROP CONSTRAINT payment_items_payment_id_fkey;

ALTER TABLE payment_items 
ADD CONSTRAINT fk_payment_items_payment_header 
FOREIGN KEY (payment_header_id) REFERENCES payment_headers(id);

-- Step 7: Update any existing indexes
-- Note: Check if these indexes exist before dropping
-- DROP INDEX IF EXISTS ix_payment_items_payment_id;
-- CREATE INDEX ix_payment_items_payment_header_id ON payment_items(payment_header_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'payment_headers' 
-- ORDER BY ordinal_position;

-- Verify foreign key constraints
-- SELECT conname, contype, confrelid::regclass AS referenced_table
-- FROM pg_constraint 
-- WHERE conrelid = 'payment_headers'::regclass;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- Rollback steps (run in reverse order):

-- Remove foreign key constraint from payment_headers
ALTER TABLE payment_headers DROP CONSTRAINT IF EXISTS fk_payment_headers_account;

-- Remove account_id column
ALTER TABLE payment_headers DROP COLUMN IF EXISTS account_id;

-- Rename payment_headers back to payments
ALTER TABLE payment_headers RENAME TO payments;

-- Update payment_items foreign key back
ALTER TABLE payment_items DROP CONSTRAINT IF EXISTS fk_payment_items_payment_header;
ALTER TABLE payment_items RENAME COLUMN payment_header_id TO payment_id;
ALTER TABLE payment_items ADD CONSTRAINT payment_items_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. Update application code to use PaymentHeader model
-- 2. Update services to populate account_id when creating payments
-- 3. Test payment creation and retrieval
-- 4. Update any reports or queries that reference the old table name
--
-- The account_id field is nullable to maintain compatibility with existing
-- payments that don't have accounting information assigned yet.
--
-- ============================================================================