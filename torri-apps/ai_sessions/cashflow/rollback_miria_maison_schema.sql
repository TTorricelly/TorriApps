-- ============================================================================
-- ROLLBACK MIRIA_MAISON SCHEMA MIGRATION
-- ============================================================================
-- Use this only if you need to undo the migration

SET search_path TO miria_maison;

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

-- Recreate original constraint and index (miria_maison has unique index, not constraint)
ALTER TABLE payment_items ADD CONSTRAINT payment_items_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id);

-- Recreate original unique index (miria_maison specific)
CREATE UNIQUE INDEX ix_payments_payment_id ON payments(payment_id);
CREATE INDEX ix_payment_items_payment_id ON payment_items(payment_id);

-- Drop new indexes
DROP INDEX IF EXISTS ix_payment_headers_account_id;
DROP INDEX IF EXISTS ix_payment_headers_payment_id;
DROP INDEX IF EXISTS ix_payment_items_payment_header_id;
DROP INDEX IF EXISTS ix_payment_headers_client_id;
DROP INDEX IF EXISTS ix_payment_headers_created_at;
DROP INDEX IF EXISTS ix_payment_headers_payment_status;

COMMIT;

SELECT 'MIRIA_MAISON SCHEMA ROLLBACK COMPLETED' as status;