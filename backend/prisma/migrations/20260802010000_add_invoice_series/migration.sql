-- Invoice numbering series master (e.g. "SVT", "SVT/AB") — each row gets its
-- own independent running number per financial year via the existing
-- NumberSequence counter (key = `${code}/${fy}`), so adding a new series is
-- just a new row, no code change.
CREATE TABLE `invoice_series` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `invoice_series_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4;

INSERT INTO `invoice_series` (`code`, `label`, `is_active`, `updated_at`) VALUES
  ('SVT', 'SVT/26-27/', true, CURRENT_TIMESTAMP(3)),
  ('SVT/AB', 'SVT/AB/26-27/', true, CURRENT_TIMESTAMP(3));

ALTER TABLE `tax_invoices`
  ADD COLUMN `invoice_series_id` INT NULL,
  ADD COLUMN `print_count` INT NOT NULL DEFAULT 0;

ALTER TABLE `tax_invoices`
  ADD CONSTRAINT `tax_invoices_invoice_series_id_fkey`
  FOREIGN KEY (`invoice_series_id`) REFERENCES `invoice_series`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `tax_invoices_invoice_series_id_idx` ON `tax_invoices`(`invoice_series_id`);
