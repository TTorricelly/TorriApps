-- ============================================================================
-- PAYABLES RECEIVABLES TABLE MIGRATION
-- ============================================================================
-- 
-- This script creates the payables_receivables table for cashflow management
-- 
-- Features:
-- - Tracks both money owed to us (RECEIVABLES) and money we owe (PAYABLES)
-- - Polymorphic reference to source entities (appointments, supplier bills, etc.)
-- - Payment tracking with partial payment support
-- - Status tracking (OPEN, PARTIAL, PAID, CANCELLED)
-- - Overdue tracking with due dates
--
-- Run this migration for each tenant schema
-- ============================================================================

-- Step 1: Create ENUM types
CREATE TYPE direction_enum AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE payable_receivable_status_enum AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');
CREATE TYPE reference_type_enum AS ENUM ('APPOINTMENT', 'SUPPLIER_BILL', 'MANUAL_ENTRY');

-- Step 2: Create the payables_receivables table
CREATE TABLE payables_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Direction: whether this is money we owe (PAYABLE) or money owed to us (RECEIVABLE)
    direction direction_enum NOT NULL,
    
    -- Financial details
    due_date DATE NOT NULL,
    original_amount DECIMAL(18,2) NOT NULL CHECK (original_amount > 0),
    open_amount DECIMAL(18,2) NOT NULL CHECK (open_amount >= 0),
    
    -- Counterparty information
    counterparty VARCHAR(255) NOT NULL,
    
    -- Status tracking
    status payable_receivable_status_enum NOT NULL DEFAULT 'OPEN',
    
    -- Polymorphic reference to source entity (appointment, supplier bill, etc.)
    reference_type reference_type_enum NOT NULL,
    reference_id UUID NOT NULL,
    
    -- Additional metadata
    description TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX ix_payables_receivables_id ON payables_receivables(id);
CREATE INDEX ix_payables_receivables_direction ON payables_receivables(direction);
CREATE INDEX ix_payables_receivables_due_date ON payables_receivables(due_date);
CREATE INDEX ix_payables_receivables_counterparty ON payables_receivables(counterparty);
CREATE INDEX ix_payables_receivables_status ON payables_receivables(status);
CREATE INDEX ix_payables_receivables_reference_type ON payables_receivables(reference_type);
CREATE INDEX ix_payables_receivables_reference_id ON payables_receivables(reference_id);

-- Step 4: Create composite indexes for common queries
CREATE INDEX ix_payables_receivables_direction_status ON payables_receivables(direction, status);
CREATE INDEX ix_payables_receivables_due_date_status ON payables_receivables(due_date, status);
CREATE INDEX ix_payables_receivables_reference ON payables_receivables(reference_type, reference_id);

-- Step 5: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payables_receivables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for automatic updated_at
CREATE TRIGGER update_payables_receivables_updated_at_trigger
    BEFORE UPDATE ON payables_receivables
    FOR EACH ROW
    EXECUTE FUNCTION update_payables_receivables_updated_at();

-- Step 7: Add constraint to ensure open_amount <= original_amount
ALTER TABLE payables_receivables 
ADD CONSTRAINT check_open_amount_lte_original 
CHECK (open_amount <= original_amount);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
SELECT 'payables_receivables table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payables_receivables' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT 'payables_receivables indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'payables_receivables';

-- Verify constraints
SELECT 'payables_receivables constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payables_receivables'::regclass;

-- ============================================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================================

/*
-- Insert sample receivable (money owed to us from appointment)
INSERT INTO payables_receivables (
    direction, due_date, original_amount, open_amount, counterparty, 
    reference_type, reference_id, description
) VALUES (
    'RECEIVABLE', 
    CURRENT_DATE + INTERVAL '30 days',
    150.00, 
    150.00, 
    'João Silva',
    'APPOINTMENT',
    gen_random_uuid(),
    'Corte de cabelo e barba - Appointment payment'
);

-- Insert sample payable (money we owe to supplier)
INSERT INTO payables_receivables (
    direction, due_date, original_amount, open_amount, counterparty, 
    reference_type, reference_id, description
) VALUES (
    'PAYABLE', 
    CURRENT_DATE + INTERVAL '15 days',
    500.00, 
    500.00, 
    'Distribuidora de Produtos de Beleza Ltda',
    'SUPPLIER_BILL',
    gen_random_uuid(),
    'Compra de produtos de cabelo - Nota fiscal 12345'
);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- Drop everything in reverse order
DROP TRIGGER IF EXISTS update_payables_receivables_updated_at_trigger ON payables_receivables;
DROP FUNCTION IF EXISTS update_payables_receivables_updated_at();
DROP TABLE IF EXISTS payables_receivables;
DROP TYPE IF EXISTS reference_type_enum;
DROP TYPE IF EXISTS payable_receivable_status_enum;
DROP TYPE IF EXISTS direction_enum;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This table implements:
-- 1. Dual nature tracking (receivables vs payables)
-- 2. Polymorphic references to source entities
-- 3. Partial payment support (open_amount vs original_amount)
-- 4. Status progression (OPEN -> PARTIAL -> PAID)
-- 5. Overdue tracking via due_date
-- 6. Comprehensive indexing for performance
-- 7. Data integrity constraints
--
-- Future enhancements could include:
-- - Payment history tracking table
-- - Foreign key constraints to specific reference tables
-- - Additional reference types as business grows
-- - Currency support for multi-currency operations
-- - Interest calculation for overdue amounts
--
-- ============================================================================