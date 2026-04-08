-- CreateTable
CREATE TABLE `furnace_plan_days` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `furnace_plan_days_plan_date_key`(`plan_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `furnace_plan_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_day_id` INTEGER NOT NULL,
    `machine_id` INTEGER NOT NULL,
    `job_card_id` INTEGER NULL,
    `process_type_id` INTEGER NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `end_next_day` BOOLEAN NOT NULL DEFAULT false,
    `temp_c` INTEGER NULL,
    `hold_min` INTEGER NULL,
    `pressure_bar` DECIMAL(6, 2) NULL,
    `fan_rpm` INTEGER NULL,
    `hold_at_c` INTEGER NULL,
    `hold_extra_min` INTEGER NULL,
    `title` VARCHAR(200) NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `furnace_plan_slots_plan_day_id_machine_id_idx`(`plan_day_id`, `machine_id`),
    INDEX `furnace_plan_slots_job_card_id_idx`(`job_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `furnace_plan_days` ADD CONSTRAINT `furnace_plan_days_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_plan_slots` ADD CONSTRAINT `furnace_plan_slots_plan_day_id_fkey` FOREIGN KEY (`plan_day_id`) REFERENCES `furnace_plan_days`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_plan_slots` ADD CONSTRAINT `furnace_plan_slots_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_plan_slots` ADD CONSTRAINT `furnace_plan_slots_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_plan_slots` ADD CONSTRAINT `furnace_plan_slots_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
