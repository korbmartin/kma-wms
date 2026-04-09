ALTER TABLE order_lines DROP CONSTRAINT order_lines_order_fkey;
ALTER TABLE order_lines ADD CONSTRAINT order_lines_order_fkey FOREIGN KEY ("order") REFERENCES order_header("order") ON DELETE CASCADE;

ALTER TABLE inventory_transaction DROP CONSTRAINT inventory_transaction_order_fkey;
ALTER TABLE inventory_transaction ADD CONSTRAINT inventory_transaction_order_fkey FOREIGN KEY ("order") REFERENCES order_header("order") ON DELETE CASCADE;

ALTER TABLE pre_advice_lines DROP CONSTRAINT pre_advice_lines_pre_advice_id_fkey;
ALTER TABLE pre_advice_lines ADD CONSTRAINT pre_advice_lines_pre_advice_id_fkey FOREIGN KEY (pre_advice_id) REFERENCES pre_advice(pre_advice_id) ON DELETE CASCADE;
