-- ============================================================================
-- MIRIA_MAISON SCHEMA PAYMENT HEADERS MIGRATION
-- ============================================================================

SET search_path TO miria_maison;

-- Verify we're in the correct schema
SELECT current_schema() as current_schema;

BEGIN;

-- Step 1: Drop existing foreign key constraints that reference payments table
-- Based on your structure: payment_items_payment_id_fkey references payments(id)
ALTER TABLE payment_items DROP CONSTRAINT IF EXISTS payment_items_payment_id_fkey;
-- Note: payments_client_id_fkey (payments -> users) will be automatically updated when table is renamed

-- Step 2: Rename the payments table to payment_headers
ALTER TABLE payments RENAME TO payment_headers;

-- Step 3: Add account_id field to payment_headers
ALTER TABLE payment_headers 
ADD COLUMN account_id VARCHAR(36);

-- Step 4: Add foreign key constraint to accounts table (if accounts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'miria_maison') THEN
        ALTER TABLE payment_headers 
        ADD CONSTRAINT fk_payment_headers_account 
        FOREIGN KEY (account_id) REFERENCES accounts(id);
        RAISE NOTICE 'Added foreign key constraint to accounts table';
    ELSE
        RAISE NOTICE 'Accounts table does not exist in miria_maison schema, skipping foreign key constraint';
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

-- Step 8: Handle indexes based on miria_maison schema structure
-- Primary key will be automatically renamed to payment_headers_pkey

-- Note: miria_maison has ix_payments_payment_id as UNIQUE INDEX, so we need to handle this
-- Drop the old unique index and recreate as constraint + index
DROP INDEX IF EXISTS ix_payments_payment_id;
ALTER TABLE payment_headers ADD CONSTRAINT payment_headers_payment_id_key UNIQUE (payment_id);
CREATE INDEX ix_payment_headers_payment_id ON payment_headers(payment_id);

-- Update payment_items indexes
DROP INDEX IF EXISTS ix_payment_items_payment_id;
CREATE INDEX ix_payment_items_payment_header_id ON payment_items(payment_header_id);

-- Create additional useful indexes
CREATE INDEX ix_payment_headers_client_id ON payment_headers(client_id);
CREATE INDEX ix_payment_headers_created_at ON payment_headers(created_at);
CREATE INDEX ix_payment_headers_payment_status ON payment_headers(payment_status);

COMMIT;

-- Verification
SELECT 'MIRIA_MAISON SCHEMA MIGRATION COMPLETED' as status;
SELECT 'Record count: ' || COUNT(*) || ' payment_headers' as info FROM payment_headers;