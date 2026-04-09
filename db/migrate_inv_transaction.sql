-- Migration: restructure inventory_transaction for status change auditing
-- Add 'Status Change' transaction code
INSERT INTO transaction_codes (code) VALUES ('Status Change') ON CONFLICT DO NOTHING;

-- Drop old FK constraints and columns, add new ones
ALTER TABLE inventory_transaction
    DROP COLUMN IF EXISTS qty_available,
    DROP COLUMN IF EXISTS qty_allocated,
    DROP COLUMN IF EXISTS "order";

-- Add new columns (IF NOT EXISTS not supported for ADD COLUMN in all PG versions, use DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='type') THEN
        ALTER TABLE inventory_transaction ADD COLUMN type VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='status') THEN
        ALTER TABLE inventory_transaction ADD COLUMN status VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='qty') THEN
        ALTER TABLE inventory_transaction ADD COLUMN qty INTEGER DEFAULT 0;
    END IF;
END $$;

-- Drop FK constraints on client_id and location so they're just plain text columns
ALTER TABLE inventory_transaction DROP CONSTRAINT IF EXISTS inventory_transaction_client_id_fkey;
ALTER TABLE inventory_transaction DROP CONSTRAINT IF EXISTS inventory_transaction_location_fkey;
