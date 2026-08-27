-- e-Way Bill ki date. Number pehle se maujood tha (e_way_bill_no); portal se
-- IRN ke saath EWB date bhi wapas aati hai, use rakhne ke liye ye column.
ALTER TABLE `tax_invoices`
  ADD COLUMN `e_way_bill_date` DATETIME(3) NULL AFTER `e_way_bill_no`;
