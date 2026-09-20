-- AlterTable: shop-floor per-furnace serial on the run sheet
ALTER TABLE `vht_runsheets` ADD COLUMN `furnace_cycle_no` VARCHAR(50) NULL;
CREATE INDEX `vht_runsheets_furnace_cycle_no_idx` ON `vht_runsheets`(`furnace_cycle_no`);

-- AlterTable: add TEMPERING to the run sheet status enum
ALTER TABLE `vht_runsheets` MODIFY COLUMN `status` ENUM('PLANNED', 'IN_PROGRESS', 'TEMPERING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED';

-- AlterTable: second free-text line on the tempering board
ALTER TABLE `furnace_plan_slots` ADD COLUMN `batch_label` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `furnace_plan_slot_runsheets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot_id` INTEGER NOT NULL,
    `runsheet_id` INTEGER NOT NULL,

    UNIQUE INDEX `furnace_plan_slot_runsheets_slot_id_runsheet_id_key`(`slot_id`, `runsheet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `energy_log_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machine_id` INTEGER NULL,
    `furnace_name` VARCHAR(100) NULL,
    `log_year` INTEGER NOT NULL,
    `log_month` INTEGER NOT NULL,
    `sr_no` INTEGER NOT NULL,
    `furnace_cycle_no` VARCHAR(50) NOT NULL,
    `runsheet_id` INTEGER NULL,
    `cycle_weight_kg` DECIMAL(10, 2) NULL,
    `start_meter` DECIMAL(14, 2) NULL,
    `end_meter` DECIMAL(14, 2) NULL,
    `consumption_kw` DECIMAL(10, 2) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `energy_log_entries_log_year_log_month_machine_id_idx`(`log_year`, `log_month`, `machine_id`),
    INDEX `energy_log_entries_runsheet_id_idx`(`runsheet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `furnace_plan_slot_runsheets` ADD CONSTRAINT `furnace_plan_slot_runsheets_slot_id_fkey` FOREIGN KEY (`slot_id`) REFERENCES `furnace_plan_slots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_plan_slot_runsheets` ADD CONSTRAINT `furnace_plan_slot_runsheets_runsheet_id_fkey` FOREIGN KEY (`runsheet_id`) REFERENCES `vht_runsheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `energy_log_entries` ADD CONSTRAINT `energy_log_entries_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `energy_log_entries` ADD CONSTRAINT `energy_log_entries_runsheet_id_fkey` FOREIGN KEY (`runsheet_id`) REFERENCES `vht_runsheets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `energy_log_entries` ADD CONSTRAINT `energy_log_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
