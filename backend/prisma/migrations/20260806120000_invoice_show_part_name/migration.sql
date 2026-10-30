-- Per-invoice choice: print the customer's part name under the process, or
-- bill the process alone. Existing invoices keep the current behaviour.
ALTER TABLE `tax_invoices`
  ADD COLUMN `show_part_name` BOOLEAN NOT NULL DEFAULT true;
