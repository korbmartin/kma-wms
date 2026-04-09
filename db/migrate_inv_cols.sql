DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='order') THEN
        ALTER TABLE inventory_transaction ADD COLUMN "order" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='pre_advice_id') THEN
        ALTER TABLE inventory_transaction ADD COLUMN pre_advice_id VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='order_line_id') THEN
        ALTER TABLE inventory_transaction ADD COLUMN order_line_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transaction' AND column_name='pre_advice_line_id') THEN
        ALTER TABLE inventory_transaction ADD COLUMN pre_advice_line_id VARCHAR(50);
    END IF;
END $$;
