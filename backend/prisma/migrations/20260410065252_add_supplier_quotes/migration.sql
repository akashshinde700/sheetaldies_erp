/*
  Warnings:

  - Added the required column `run_date` to the `vht_runsheets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `vht_runsheet_items` DROP FOREIGN KEY `vht_runsheet_items_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `vht_runsheets` DROP FOREIGN KEY `vht_runsheets_batch_id_fkey`;

-- AlterTable
ALTER TABLE `vht_runsheet_items` ADD COLUMN `customer_name` VARCHAR(200) NULL,
    ADD COLUMN `hrc_required` VARCHAR(50) NULL,
    ADD COLUMN `job_card_id` INTEGER NULL,
    ADD COLUMN `job_description` VARCHAR(300) NULL,
    ADD COLUMN `material_grade` VARCHAR(100) NULL,
    ADD COLUMN `weight_kg` DECIMAL(10, 3) NULL,
    MODIFY `item_id` INTEGER NULL,
    MODIFY `planned_slot` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `vht_runsheets` ADD COLUMN `cycle_end_time` VARCHAR(10) NULL,
    ADD COLUMN `doc_effective_date` DATE NULL,
    ADD COLUMN `doc_page_of` VARCHAR(20) NULL,
    ADD COLUMN `doc_rev_no` VARCHAR(20) NULL,
    ADD COLUMN `fan_rpm` INTEGER NULL,
    ADD COLUMN `fixtures_position` VARCHAR(120) NULL,
    ADD COLUMN `hardening_type` VARCHAR(200) NULL,
    ADD COLUMN `loading_operator_name` VARCHAR(100) NULL,
    ADD COLUMN `mr_end` INTEGER NULL,
    ADD COLUMN `mr_start` INTEGER NULL,
    ADD COLUMN `operator_sign` VARCHAR(150) NULL,
    ADD COLUMN `quench_pressure_bar` DECIMAL(6, 2) NULL,
    ADD COLUMN `run_date` DATE NOT NULL,
    ADD COLUMN `supervisor_sign` VARCHAR(150) NULL,
    ADD COLUMN `supervisor_verified_at` DATETIME(3) NULL,
    ADD COLUMN `temp_graph_points` JSON NULL,
    ADD COLUMN `total_mr` INTEGER NULL,
    ADD COLUMN `total_time_display` VARCHAR(20) NULL,
    ADD COLUMN `verification_note` TEXT NULL,
    MODIFY `batch_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `source` ENUM('GRN', 'MANUAL_ADJUSTMENT') NOT NULL,
    `quantity_change` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `reorder_level_after` INTEGER NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` INTEGER NULL,
    `remarks` VARCHAR(300) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_movements_item_id_created_at_idx`(`item_id`, `created_at`),
    INDEX `inventory_movements_source_created_at_idx`(`source`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_quotes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quote_number` VARCHAR(50) NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `quote_date` DATE NOT NULL,
    `valid_until` DATE NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_PO') NOT NULL DEFAULT 'DRAFT',
    `description` TEXT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax_rate` DECIMAL(5, 2) NULL,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `payment_terms` VARCHAR(300) NULL,
    `delivery_days` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `purchase_order_id` INTEGER NULL,

    UNIQUE INDEX `supplier_quotes_quote_number_key`(`quote_number`),
    INDEX `supplier_quotes_vendor_id_quote_date_idx`(`vendor_id`, `quote_date`),
    INDEX `supplier_quotes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quote_id` INTEGER NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `specification` TEXT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'NOS',
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `remarks` VARCHAR(300) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `attachment_type` ENUM('PHOTO', 'DOCUMENT', 'CERTIFICATE', 'DRAWING', 'INSPECTION_REPORT', 'PURCHASE_QUOTE', 'CONTRACT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` TEXT NULL,
    `job_card_id` INTEGER NULL,
    `test_cert_id` INTEGER NULL,
    `quote_id` INTEGER NULL,
    `purchase_order_id` INTEGER NULL,
    `jobwork_challan_id` INTEGER NULL,
    `entity_type` VARCHAR(100) NULL,
    `entity_id` INTEGER NULL,
    `uploaded_by` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attachments_job_card_id_idx`(`job_card_id`),
    INDEX `attachments_test_cert_id_idx`(`test_cert_id`),
    INDEX `attachments_quote_id_idx`(`quote_id`),
    INDEX `attachments_purchase_order_id_idx`(`purchase_order_id`),
    INDEX `attachments_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `vht_runsheet_items_job_card_id_idx` ON `vht_runsheet_items`(`job_card_id`);

-- CreateIndex
CREATE INDEX `vht_runsheets_run_date_furnace_id_idx` ON `vht_runsheets`(`run_date`, `furnace_id`);

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheets` ADD CONSTRAINT `vht_runsheets_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `manufacturing_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheet_items` ADD CONSTRAINT `vht_runsheet_items_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheet_items` ADD CONSTRAINT `vht_runsheet_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `supplier_quotes_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `supplier_quotes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `supplier_quotes_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `supplier_quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_test_cert_id_fkey` FOREIGN KEY (`test_cert_id`) REFERENCES `test_certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `supplier_quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_jobwork_challan_id_fkey` FOREIGN KEY (`jobwork_challan_id`) REFERENCES `jobwork_challans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
