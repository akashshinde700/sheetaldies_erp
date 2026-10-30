-- Reusable Temperature Cycle Data templates. Exactly one row may have
-- is_default = true at a time (enforced in application code inside a
-- transaction, not at the DB level, since MySQL has no partial unique index).
CREATE TABLE `temp_cycle_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `data` JSON NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `temp_cycle_templates_is_default_idx`(`is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `temp_cycle_templates` ADD CONSTRAINT `temp_cycle_templates_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
