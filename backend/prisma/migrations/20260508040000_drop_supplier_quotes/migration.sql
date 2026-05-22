-- Remove quote_id FK and column from attachments first (prevents FK constraint error)
ALTER TABLE `attachments` DROP FOREIGN KEY `attachments_quote_id_fkey`;
ALTER TABLE `attachments` DROP INDEX `attachments_quote_id_idx`;
ALTER TABLE `attachments` DROP COLUMN `quote_id`;

-- Now safe to drop the supplier quotes tables
DROP TABLE IF EXISTS `quote_items`;
DROP TABLE IF EXISTS `supplier_quotes`;
