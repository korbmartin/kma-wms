DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'ship_dock'
    ) THEN
        ALTER TABLE order_lines ADD COLUMN ship_dock VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'suspense'
    ) THEN
        ALTER TABLE inventory ADD COLUMN suspense INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'inventory_transaction' AND column_name = 'update_qty'
    ) THEN
        ALTER TABLE inventory_transaction ADD COLUMN update_qty INTEGER DEFAULT 0;
    END IF;
END $$;

