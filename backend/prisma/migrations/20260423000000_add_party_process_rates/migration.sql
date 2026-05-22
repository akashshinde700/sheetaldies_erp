-- CreateTable
CREATE TABLE `party_process_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `party_id` INTEGER NOT NULL,
    `process_type_id` INTEGER NOT NULL,
    `price_per_kg` DECIMAL(10, 2) NULL,
    `price_per_pc` DECIMAL(10, 2) NULL,
    `min_charge` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `party_process_rates_party_id_idx`(`party_id`),
    UNIQUE INDEX `party_process_rates_party_id_process_type_id_key`(`party_id`, `process_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `party_process_rates` ADD CONSTRAINT `party_process_rates_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_process_rates` ADD CONSTRAINT `party_process_rates_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
