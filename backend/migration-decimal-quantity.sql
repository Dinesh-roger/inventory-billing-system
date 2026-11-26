-- Run this ONCE, BEFORE starting the new backend, if you already have data (old bills, products).
-- It keeps all your existing bills and converts quantities to decimals.
-- MySQL Workbench: open this file and run it, or: mysql -u root -p < migration-decimal-quantity.sql
-- If you get "Duplicate column name 'unit'", the backend already ran once: delete the ADD COLUMN line and run again.

USE inventory_db;

ALTER TABLE products
  MODIFY stock_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  MODIFY reorder_level DECIMAL(12,3) NOT NULL DEFAULT 5,
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'pcs';

ALTER TABLE invoice_items   MODIFY quantity DECIMAL(12,3);
ALTER TABLE purchase_items  MODIFY quantity DECIMAL(12,3);
ALTER TABLE stock_movements MODIFY quantity DECIMAL(12,3), MODIFY balance_after DECIMAL(12,3);

-- Optional: mark loose items as kg / litre (change the SKUs to yours)
-- UPDATE products SET unit = 'kg' WHERE sku IN ('GRO-SUG-KG', 'GRO-RICE-KG');
