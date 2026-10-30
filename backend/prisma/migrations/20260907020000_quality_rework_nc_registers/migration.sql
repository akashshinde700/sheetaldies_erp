-- CreateTable
CREATE TABLE `rework_months` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `total_processed_weight_kg` DECIMAL(12, 2) NULL,
    `target_percent` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `causes` JSON NULL,
    `corrective_actions` JSON NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rework_months_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rework_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month_id` INTEGER NOT NULL,
    `sr_no` INTEGER NOT NULL,
    `entry_date` DATE NOT NULL,
    `job_card_id` INTEGER NULL,
    `certificate_id` INTEGER NULL,
    `rework_certificate_id` INTEGER NULL,
    `customer_name` VARCHAR(200) NULL,
    `description` VARCHAR(300) NULL,
    `qty` INTEGER NULL,
    `weight_kg` DECIMAL(10, 3) NULL,
    `job_card_no_text` VARCHAR(50) NULL,
    `hardness_required` VARCHAR(50) NULL,
    `cycle_no` VARCHAR(50) NULL,
    `reason` TEXT NULL,
    `rework_cycle_no` VARCHAR(50) NULL,
    `after_process_results` VARCHAR(100) NULL,
    `remark` VARCHAR(200) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rework_entries_job_card_id_idx`(`job_card_id`),
    INDEX `rework_entries_certificate_id_idx`(`certificate_id`),
    UNIQUE INDEX `rework_entries_month_id_sr_no_key`(`month_id`, `sr_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nc_register_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sr_no` INTEGER NOT NULL,
    `entry_date` DATE NOT NULL,
    `rework_entry_id` INTEGER NULL,
    `certificate_id` INTEGER NULL,
    `customer_name` VARCHAR(200) NULL,
    `test_report` VARCHAR(100) NULL,
    `process` VARCHAR(200) NULL,
    `stage` VARCHAR(200) NULL,
    `nc_qty` VARCHAR(20) NULL,
    `nc_details` TEXT NULL,
    `disposition` TEXT NULL,
    `root_cause_analysis` TEXT NULL,
    `corrective_action` TEXT NULL,
    `re_verification` VARCHAR(200) NULL,
    `sign` VARCHAR(100) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nc_register_entries_rework_entry_id_idx`(`rework_entry_id`),
    INDEX `nc_register_entries_certificate_id_idx`(`certificate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rework_months` ADD CONSTRAINT `rework_months_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_month_id_fkey` FOREIGN KEY (`month_id`) REFERENCES `rework_months`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_certificate_id_fkey` FOREIGN KEY (`certificate_id`) REFERENCES `test_certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_rework_certificate_id_fkey` FOREIGN KEY (`rework_certificate_id`) REFERENCES `test_certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nc_register_entries` ADD CONSTRAINT `nc_register_entries_rework_entry_id_fkey` FOREIGN KEY (`rework_entry_id`) REFERENCES `rework_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nc_register_entries` ADD CONSTRAINT `nc_register_entries_certificate_id_fkey` FOREIGN KEY (`certificate_id`) REFERENCES `test_certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nc_register_entries` ADD CONSTRAINT `nc_register_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
