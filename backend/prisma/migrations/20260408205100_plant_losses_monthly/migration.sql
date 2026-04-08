-- CreateTable
CREATE TABLE `plant_loss_months` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plant_loss_months_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plant_loss_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month_id` INTEGER NOT NULL,
    `machine_id` INTEGER NULL,
    `furnace_name` VARCHAR(120) NULL,
    `available_hours` DECIMAL(10, 2) NOT NULL DEFAULT 624,
    `used_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `loading_unloading_min` DECIMAL(10, 2) NULL,
    `waiting_cycle_prep_hrs` DECIMAL(10, 2) NULL,
    `waiting_material_hrs` DECIMAL(10, 2) NULL,
    `cleaning_furnace_hrs` DECIMAL(10, 2) NULL,
    `breakdown_maint_hrs` DECIMAL(10, 2) NULL,
    `no_power_hrs` DECIMAL(10, 2) NULL,
    `no_material_hrs` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `plant_loss_entries_month_id_idx`(`month_id`),
    INDEX `plant_loss_entries_machine_id_idx`(`machine_id`),
    UNIQUE INDEX `plant_loss_entries_month_id_machine_id_key`(`month_id`, `machine_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plant_loss_months` ADD CONSTRAINT `plant_loss_months_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plant_loss_entries` ADD CONSTRAINT `plant_loss_entries_month_id_fkey` FOREIGN KEY (`month_id`) REFERENCES `plant_loss_months`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plant_loss_entries` ADD CONSTRAINT `plant_loss_entries_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
