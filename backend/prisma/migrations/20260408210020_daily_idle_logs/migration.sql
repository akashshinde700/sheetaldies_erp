-- CreateTable
CREATE TABLE `daily_idle_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machine_id` INTEGER NOT NULL,
    `log_date` DATE NOT NULL,
    `loading_unloading_min` INTEGER NOT NULL DEFAULT 0,
    `waiting_cycle_prep_min` INTEGER NOT NULL DEFAULT 0,
    `waiting_material_min` INTEGER NOT NULL DEFAULT 0,
    `preventive_maint_min` INTEGER NOT NULL DEFAULT 0,
    `breakdown_maint_min` INTEGER NOT NULL DEFAULT 0,
    `no_power_min` INTEGER NOT NULL DEFAULT 0,
    `no_material_min` INTEGER NOT NULL DEFAULT 0,
    `remarks` VARCHAR(300) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `daily_idle_logs_log_date_idx`(`log_date`),
    UNIQUE INDEX `daily_idle_logs_machine_id_log_date_key`(`machine_id`, `log_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_idle_logs` ADD CONSTRAINT `daily_idle_logs_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_idle_logs` ADD CONSTRAINT `daily_idle_logs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
