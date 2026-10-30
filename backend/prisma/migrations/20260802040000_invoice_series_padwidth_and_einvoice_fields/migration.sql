ALTER TABLE `invoice_series`
  ADD COLUMN `pad_width` INT NOT NULL DEFAULT 4;

-- SVT/AB series uses a 3-digit running number; SVT stays at the default 4.
UPDATE `invoice_series` SET `pad_width` = 3 WHERE `code` = 'SVT/AB';

ALTER TABLE `tax_invoices`
  ADD COLUMN `irn_no` VARCHAR(100) NULL,
  ADD COLUMN `ack_no` VARCHAR(50) NULL,
  ADD COLUMN `ack_date` DATETIME(3) NULL;
