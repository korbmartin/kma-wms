ALTER TABLE inventory_transaction DROP CONSTRAINT inventory_transaction_order_fkey;
ALTER TABLE inventory_transaction ADD CONSTRAINT inventory_transaction_order_fkey FOREIGN KEY ("order") REFERENCES order_header("order") ON DELETE SET NULL;
