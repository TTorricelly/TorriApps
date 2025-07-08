set search_path to miria_maison;
-- Create ledger_entries table for double-entry bookkeeping
  CREATE TABLE ledger_entries (
      id BIGSERIAL PRIMARY KEY,
      tx_id UUID NOT NULL,
      account_id VARCHAR(36) NOT NULL,  -- Changed from UUID to VARCHAR(36) to match accounts table
      amount DECIMAL(18,2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'BRL',
      professional_id UUID NULL,  -- UUID type matches users table (professionals reference users)
      event_id UUID NULL,         -- UUID type matches payables_receivables table
      payment_id UUID NULL,       -- UUID type matches payment_headers table
      note TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by UUID NULL,       -- UUID type matches users table

      -- Foreign key constraints
      CONSTRAINT fk_ledger_entries_account
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,

      CONSTRAINT fk_ledger_entries_professional
          FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL,

      CONSTRAINT fk_ledger_entries_event
          FOREIGN KEY (event_id) REFERENCES payables_receivables(id) ON DELETE SET NULL,

      CONSTRAINT fk_ledger_entries_payment
          FOREIGN KEY (payment_id) REFERENCES payment_headers(id) ON DELETE SET NULL,

      CONSTRAINT fk_ledger_entries_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

      -- Business constraints
      CONSTRAINT check_amount_not_zero
          CHECK (amount != 0),

      CONSTRAINT check_currency_format
          CHECK (LENGTH(currency) = 3)
  );

  -- Create indexes for performance
  CREATE INDEX idx_ledger_entries_tx_id ON ledger_entries(tx_id);
  CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
  CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at);
  CREATE INDEX idx_ledger_entries_professional_id ON ledger_entries(professional_id) WHERE professional_id IS NOT NULL;
  CREATE INDEX idx_ledger_entries_event_id ON ledger_entries(event_id) WHERE event_id IS NOT NULL;
  CREATE INDEX idx_ledger_entries_payment_id ON ledger_entries(payment_id) WHERE payment_id IS NOT NULL;

  -- Create composite index for transaction balancing queries
  CREATE INDEX idx_ledger_entries_tx_amount ON ledger_entries(tx_id, amount);

  -- Add comment to table
  COMMENT ON TABLE ledger_entries IS 'Double-entry bookkeeping ledger entries. Amount is positive for debits, negative for credits.';

  -- Add column comments
  COMMENT ON COLUMN ledger_entries.tx_id IS 'Groups the two legs of a double-entry transaction';
  COMMENT ON COLUMN ledger_entries.amount IS 'Positive for debit entries, negative for credit entries';
  COMMENT ON COLUMN ledger_entries.currency IS 'ISO 4217 currency code';
  COMMENT ON COLUMN ledger_entries.professional_id IS 'Optional reference to professional (for service-related entries)';
  COMMENT ON COLUMN ledger_entries.event_id IS 'Optional reference to payable/receivable event';
  COMMENT ON COLUMN ledger_entries.payment_id IS 'Optional reference to payment transaction';

set search_path to miria_maison;
  CREATE TABLE payment_method_configs (
    id VARCHAR(36) PRIMARY KEY,
    payment_method payment_method_enum NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_payment_config_account 
        FOREIGN KEY (account_code) REFERENCES accounts(code)
);


select * from miria_maison.payment_method_configs

SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'payment_method_enum';
--
  -- Insert default payment method configurations for existing tenants
  -- This script should be run after creating the payment_method_configs table
set search_path to miria_maison;
  ALTER TABLE payment_method_configs
  DROP CONSTRAINT IF EXISTS uq_account_id;

   CREATE INDEX idx_payment_config_account_id
  ON payment_method_configs(account_id);
  -- Insert default configuration for CASH -> Caixa Geral
  INSERT INTO payment_method_configs (id, payment_method, account_code, is_active, created_at, updated_at)
  SELECT
      gen_random_uuid()::varchar(36),
      'CASH',
      '1.1.1.001',
      TRUE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
      SELECT 1 FROM payment_method_configs
      WHERE payment_method = 'CASH'
  );

  -- Insert default configuration for DEBIT -> Cartão Débito a Receber
  INSERT INTO payment_method_configs (id, payment_method, account_code, is_active, created_at, updated_at)
  SELECT
      gen_random_uuid()::varchar(36),
      'DEBIT',
      '1.1.2.001',
      TRUE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
      SELECT 1 FROM payment_method_configs
      WHERE payment_method = 'DEBIT'
  );

  -- Insert default configuration for CREDIT -> Cartão Crédito a Receber
  INSERT INTO payment_method_configs (id, payment_method, account_code, is_active, created_at, updated_at)
  SELECT
      gen_random_uuid()::varchar(36),
      'CREDIT',
      '1.1.2.002',
      TRUE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
      SELECT 1 FROM payment_method_configs
      WHERE payment_method = 'CREDIT'
  );

  -- Insert default configuration for PIX -> PIX Recebimentos
  INSERT INTO payment_method_configs (id, payment_method, account_code, is_active, created_at, updated_at)
  SELECT
      gen_random_uuid()::varchar(36),
      'PIX',
      '1.1.1.002',
      TRUE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
      SELECT 1 FROM payment_method_configs
      WHERE payment_method = 'PIX'
  );
