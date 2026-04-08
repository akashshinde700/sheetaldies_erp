-- CreateTable
CREATE TABLE `furnace_utilization_days` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machine_id` INTEGER NOT NULL,
    `util_date` DATE NOT NULL,
    `shift1_used_min` INTEGER NOT NULL DEFAULT 0,
    `shift2_used_min` INTEGER NOT NULL DEFAULT 0,
    `shift3_used_min` INTEGER NOT NULL DEFAULT 0,
    `s1_a` INTEGER NOT NULL DEFAULT 0,
    `s1_b` INTEGER NOT NULL DEFAULT 0,
    `s1_c` INTEGER NOT NULL DEFAULT 0,
    `s1_d` INTEGER NOT NULL DEFAULT 0,
    `s1_e` INTEGER NOT NULL DEFAULT 0,
    `s1_f` INTEGER NOT NULL DEFAULT 0,
    `s1_g` INTEGER NOT NULL DEFAULT 0,
    `s2_a` INTEGER NOT NULL DEFAULT 0,
    `s2_b` INTEGER NOT NULL DEFAULT 0,
    `s2_c` INTEGER NOT NULL DEFAULT 0,
    `s2_d` INTEGER NOT NULL DEFAULT 0,
    `s2_e` INTEGER NOT NULL DEFAULT 0,
    `s2_f` INTEGER NOT NULL DEFAULT 0,
    `s2_g` INTEGER NOT NULL DEFAULT 0,
    `s3_a` INTEGER NOT NULL DEFAULT 0,
    `s3_b` INTEGER NOT NULL DEFAULT 0,
    `s3_c` INTEGER NOT NULL DEFAULT 0,
    `s3_d` INTEGER NOT NULL DEFAULT 0,
    `s3_e` INTEGER NOT NULL DEFAULT 0,
    `s3_f` INTEGER NOT NULL DEFAULT 0,
    `s3_g` INTEGER NOT NULL DEFAULT 0,
    `remarks` VARCHAR(300) NULL,
    `signed_by` VARCHAR(100) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `furnace_utilization_days_util_date_idx`(`util_date`),
    UNIQUE INDEX `furnace_utilization_days_machine_id_util_date_key`(`machine_id`, `util_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `furnace_utilization_days` ADD CONSTRAINT `furnace_utilization_days_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `furnace_utilization_days` ADD CONSTRAINT `furnace_utilization_days_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
