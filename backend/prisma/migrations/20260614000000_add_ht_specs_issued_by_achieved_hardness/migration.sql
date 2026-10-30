-- CreateTable: heat_treat_specs
CREATE TABLE IF NOT EXISTS `heat_treat_specs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `heat_treat_specs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add issued_by to jobwork_challans
ALTER TABLE `jobwork_challans` ADD COLUMN `issued_by` VARCHAR(100) NULL;

-- AlterTable: add achieved_hardness to test_certificates
ALTER TABLE `test_certificates` ADD COLUMN `achieved_hardness` DECIMAL(6, 2) NULL;
