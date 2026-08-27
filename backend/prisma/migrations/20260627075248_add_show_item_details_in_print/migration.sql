/*
  Warnings:

  - You are about to alter the column `vat_tin` on the `parties` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(30)`.
  - You are about to alter the column `cst_no` on the `parties` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(30)`.

*/
-- DropForeignKey
ALTER TABLE `cert_items` DROP FOREIGN KEY `fk_cert_items_challan_item`;

-- DropForeignKey
ALTER TABLE `job_cards` DROP FOREIGN KEY `job_cards_part_id_fkey`;

-- DropForeignKey
ALTER TABLE `production_entries` DROP FOREIGN KEY `production_entries_challan_item_fk`;

-- DropForeignKey
ALTER TABLE `production_entries` DROP FOREIGN KEY `production_entries_created_by_fk`;

-- DropForeignKey
ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_item_id_fkey`;

-- DropIndex
DROP INDEX `idx_prod_entries_created_at` ON `production_entries`;

-- AlterTable
ALTER TABLE `parties` MODIFY `vat_tin` VARCHAR(30) NULL,
    MODIFY `cst_no` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `purchase_order_items` ADD COLUMN `description` TEXT NULL,
    MODIFY `item_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `test_certificates` ADD COLUMN `show_item_details_in_print` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `challan_items_challan_id_idx` ON `challan_items`(`challan_id`);

-- CreateIndex
CREATE INDEX `incoming_inspections_job_card_id_idx` ON `incoming_inspections`(`job_card_id`);

-- CreateIndex
CREATE INDEX `incoming_inspections_inspection_status_idx` ON `incoming_inspections`(`inspection_status`);

-- CreateIndex
CREATE INDEX `job_cards_status_idx` ON `job_cards`(`status`);

-- CreateIndex
CREATE INDEX `jobwork_challans_from_party_id_idx` ON `jobwork_challans`(`from_party_id`);

-- CreateIndex
CREATE INDEX `jobwork_challans_status_idx` ON `jobwork_challans`(`status`);

-- CreateIndex
CREATE INDEX `tax_invoices_invoice_no_idx` ON `tax_invoices`(`invoice_no`);

-- CreateIndex
CREATE INDEX `tax_invoices_payment_status_idx` ON `tax_invoices`(`payment_status`);

-- CreateIndex
CREATE INDEX `test_certificates_cert_no_idx` ON `test_certificates`(`cert_no`);

-- CreateIndex
CREATE INDEX `test_certificates_status_idx` ON `test_certificates`(`status`);

-- AddForeignKey
ALTER TABLE `job_cards` ADD CONSTRAINT `job_cards_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_entries` ADD CONSTRAINT `production_entries_challan_item_id_fkey` FOREIGN KEY (`challan_item_id`) REFERENCES `challan_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_entries` ADD CONSTRAINT `production_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cert_items` ADD CONSTRAINT `cert_items_source_challan_item_id_fkey` FOREIGN KEY (`source_challan_item_id`) REFERENCES `challan_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `challan_items` RENAME INDEX `challan_items_item_id_fkey` TO `challan_items_item_id_idx`;

-- RenameIndex
ALTER TABLE `dispatch_challan_items` RENAME INDEX `dispatch_challan_items_dispatch_id_fkey` TO `dispatch_challan_items_dispatch_id_idx`;

-- RenameIndex
ALTER TABLE `dispatch_challan_items` RENAME INDEX `dispatch_challan_items_source_challan_item_id_fkey` TO `dispatch_challan_items_source_challan_item_id_idx`;

-- RenameIndex
ALTER TABLE `incoming_inspections` RENAME INDEX `incoming_inspections_process_type_id_fkey` TO `incoming_inspections_process_type_id_idx`;

-- RenameIndex
ALTER TABLE `invoice_items` RENAME INDEX `invoice_items_cert_id_fkey` TO `invoice_items_cert_id_idx`;

-- RenameIndex
ALTER TABLE `invoice_items` RENAME INDEX `invoice_items_invoice_id_fkey` TO `invoice_items_invoice_id_idx`;

-- RenameIndex
ALTER TABLE `invoice_items` RENAME INDEX `invoice_items_process_type_id_fkey` TO `invoice_items_process_type_id_idx`;

-- RenameIndex
ALTER TABLE `invoice_items` RENAME INDEX `invoice_items_source_challan_item_id_fkey` TO `invoice_items_source_challan_item_id_idx`;

-- RenameIndex
ALTER TABLE `job_cards` RENAME INDEX `job_cards_customer_id_fkey` TO `job_cards_customer_id_idx`;

-- RenameIndex
ALTER TABLE `job_cards` RENAME INDEX `job_cards_machine_id_fkey` TO `job_cards_machine_id_idx`;

-- RenameIndex
ALTER TABLE `job_cards` RENAME INDEX `job_cards_part_id_fkey` TO `job_cards_part_id_idx`;

-- RenameIndex
ALTER TABLE `jobwork_challans` RENAME INDEX `jobwork_challans_job_card_id_fkey` TO `jobwork_challans_job_card_id_idx`;

-- RenameIndex
ALTER TABLE `jobwork_challans` RENAME INDEX `jobwork_challans_to_party_id_fkey` TO `jobwork_challans_to_party_id_idx`;

-- RenameIndex
ALTER TABLE `production_entries` RENAME INDEX `idx_prod_entries_challan_item` TO `production_entries_challan_item_id_idx`;

-- RenameIndex
ALTER TABLE `tax_invoices` RENAME INDEX `tax_invoices_challan_id_fkey` TO `tax_invoices_challan_id_idx`;

-- RenameIndex
ALTER TABLE `tax_invoices` RENAME INDEX `tax_invoices_to_party_id_fkey` TO `tax_invoices_to_party_id_idx`;

-- RenameIndex
ALTER TABLE `test_certificates` RENAME INDEX `test_certificates_customer_id_fkey` TO `test_certificates_customer_id_idx`;

-- RenameIndex
ALTER TABLE `test_certificates` RENAME INDEX `test_certificates_job_card_id_fkey` TO `test_certificates_job_card_id_idx`;
