-- ============================================================================
-- PAYABLES RECEIVABLES INSTALLMENTS TABLE MIGRATION
-- ============================================================================
-- 
-- This script creates the pr_installments table for managing payment installments
-- 
-- Features:
-- - Child table of payables_receivables
-- - Supports splitting payments into multiple installments
-- - Individual due dates and amounts per installment
-- - Payment tracking per installment
-- - Status tracking (OPEN, PARTIAL, PAID, CANCELLED)
-- - Automatic parent status updates
--
-- Run this migration for each tenant schema AFTER payables_receivables migration
-- ============================================================================

-- Step 1: Create ENUM type for installment status
CREATE TYPE installment_status_enum AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');

-- Step 2: Create the pr_installments table
CREATE TABLE pr_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to parent payable/receivable
    pr_id UUID NOT NULL REFERENCES payables_receivables(id) ON DELETE CASCADE,
    
    -- Installment details
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    original_amount DECIMAL(18,2) NOT NULL CHECK (original_amount > 0),
    open_amount DECIMAL(18,2) NOT NULL CHECK (open_amount >= 0),
    
    -- Status tracking
    status installment_status_enum NOT NULL DEFAULT 'OPEN',
    
    -- Payment tracking
    payment_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX ix_pr_installments_id ON pr_installments(id);
CREATE INDEX ix_pr_installments_pr_id ON pr_installments(pr_id);
CREATE INDEX ix_pr_installments_due_date ON pr_installments(due_date);
CREATE INDEX ix_pr_installments_status ON pr_installments(status);

-- Step 4: Create composite indexes for common queries
CREATE INDEX ix_pr_installments_pr_id_number ON pr_installments(pr_id, installment_number);
CREATE INDEX ix_pr_installments_due_date_status ON pr_installments(due_date, status);

-- Step 5: Create unique constraint to prevent duplicate installment numbers per parent
CREATE UNIQUE INDEX ix_pr_installments_unique_number_per_parent 
ON pr_installments(pr_id, installment_number);

-- Step 6: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pr_installments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for automatic updated_at
CREATE TRIGGER update_pr_installments_updated_at_trigger
    BEFORE UPDATE ON pr_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_pr_installments_updated_at();

-- Step 8: Add constraint to ensure open_amount <= original_amount
ALTER TABLE pr_installments 
ADD CONSTRAINT check_installment_open_amount_lte_original 
CHECK (open_amount <= original_amount);

-- Step 9: Create function to update parent status when installments change
CREATE OR REPLACE FUNCTION update_parent_payable_receivable_from_installments()
RETURNS TRIGGER AS $$
DECLARE
    parent_id UUID;
    total_paid DECIMAL(18,2);
    total_original DECIMAL(18,2);
    new_open_amount DECIMAL(18,2);
    new_status payable_receivable_status_enum;
BEGIN
    -- Get the parent ID (works for INSERT, UPDATE, DELETE)
    parent_id := COALESCE(NEW.pr_id, OLD.pr_id);
    
    -- Calculate totals from all installments for this parent
    SELECT 
        COALESCE(SUM(original_amount - open_amount), 0),
        COALESCE(SUM(original_amount), 0)
    INTO total_paid, total_original
    FROM pr_installments 
    WHERE pr_id = parent_id AND status != 'CANCELLED';
    
    -- Calculate new open amount and status
    new_open_amount := total_original - total_paid;
    
    IF new_open_amount = 0 THEN
        new_status := 'PAID';
    ELSIF new_open_amount < total_original THEN
        new_status := 'PARTIAL';
    ELSE
        new_status := 'OPEN';
    END IF;
    
    -- Update parent record
    UPDATE payables_receivables 
    SET 
        open_amount = new_open_amount,
        status = new_status,
        updated_at = NOW()
    WHERE id = parent_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create triggers to automatically update parent when installments change
CREATE TRIGGER update_parent_on_installment_insert
    AFTER INSERT ON pr_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_payable_receivable_from_installments();

CREATE TRIGGER update_parent_on_installment_update
    AFTER UPDATE ON pr_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_payable_receivable_from_installments();

CREATE TRIGGER update_parent_on_installment_delete
    AFTER DELETE ON pr_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_payable_receivable_from_installments();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
SELECT 'pr_installments table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'pr_installments' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT 'pr_installments indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'pr_installments';

-- Verify constraints
SELECT 'pr_installments constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'pr_installments'::regclass;

-- Verify foreign key relationship
SELECT 'Foreign key relationship:' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'pr_installments';

-- ============================================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================================

/*
-- First, create a sample payable/receivable
INSERT INTO payables_receivables (
    direction, due_date, original_amount, open_amount, counterparty, 
    reference_type, reference_id, description
) VALUES (
    'RECEIVABLE', 
    CURRENT_DATE + INTERVAL '90 days',
    3000.00, 
    3000.00, 
    'Maria Silva',
    'MANUAL_ENTRY',
    gen_random_uuid(),
    'Pacote completo de tratamentos - 3x sem juros'
) RETURNING id;

-- Then create installments for the above payable/receivable
-- Replace the pr_id with the actual ID from the above INSERT
INSERT INTO pr_installments (pr_id, installment_number, due_date, original_amount, open_amount) VALUES
('{REPLACE_WITH_ACTUAL_PR_ID}', 1, CURRENT_DATE + INTERVAL '30 days', 1000.00, 1000.00),
('{REPLACE_WITH_ACTUAL_PR_ID}', 2, CURRENT_DATE + INTERVAL '60 days', 1000.00, 1000.00),
('{REPLACE_WITH_ACTUAL_PR_ID}', 3, CURRENT_DATE + INTERVAL '90 days', 1000.00, 1000.00);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- Drop everything in reverse order
DROP TRIGGER IF EXISTS update_parent_on_installment_delete ON pr_installments;
DROP TRIGGER IF EXISTS update_parent_on_installment_update ON pr_installments;
DROP TRIGGER IF EXISTS update_parent_on_installment_insert ON pr_installments;
DROP FUNCTION IF EXISTS update_parent_payable_receivable_from_installments();

DROP TRIGGER IF EXISTS update_pr_installments_updated_at_trigger ON pr_installments;
DROP FUNCTION IF EXISTS update_pr_installments_updated_at();

DROP TABLE IF EXISTS pr_installments;
DROP TYPE IF EXISTS installment_status_enum;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This installments table provides:
-- 1. Child records for breaking down payments into installments
-- 2. Individual due dates and amounts per installment
-- 3. Independent payment tracking per installment
-- 4. Automatic parent status updates via triggers
-- 5. Comprehensive indexing for performance
-- 6. Data integrity constraints
-- 7. Unique installment numbers per parent
--
-- Business scenarios supported:
-- - Monthly payment plans (e.g., 3x, 6x, 12x installments)
-- - Different due dates per installment
-- - Partial payments on individual installments
-- - Independent installment cancellation
-- - Automatic parent status calculation
--
-- Performance considerations:
-- - Indexes on pr_id and due_date for efficient queries
-- - Composite indexes for common filter combinations
-- - Triggers automatically maintain parent status
-- - Foreign key with CASCADE DELETE ensures data integrity
--
-- ============================================================================