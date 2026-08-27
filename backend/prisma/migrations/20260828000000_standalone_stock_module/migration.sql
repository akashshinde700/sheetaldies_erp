-- Standalone internal stock module — apni company ka andar ka stock
-- (consumables, spares, tools, gases). Job-work Item master se alag.

-- CreateTable
CREATE TABLE `stock_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(50) NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'NOS',
    `quantity_on_hand` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `reorder_level` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `location` VARCHAR(100) NULL,
    `unit_cost` DECIMAL(14, 2) NULL,
    `track_batches` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_items_sku_key`(`sku`),
    INDEX `stock_items_category_idx`(`category`),
    INDEX `stock_items_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_item_id` INTEGER NOT NULL,
    `type` ENUM('IN', 'OUT', 'ADJUST') NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `balance_after` DECIMAL(14, 3) NOT NULL,
    `batch_no` VARCHAR(60) NULL,
    `expiry_date` DATE NULL,
    `unit_cost` DECIMAL(14, 2) NULL,
    `reason` VARCHAR(120) NULL,
    `ref_no` VARCHAR(80) NULL,
    `note` VARCHAR(500) NULL,
    `moved_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_stock_item_id_moved_at_idx`(`stock_item_id`, `moved_at`),
    INDEX `stock_movements_type_moved_at_idx`(`type`, `moved_at`),
    INDEX `stock_movements_batch_no_idx`(`batch_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_items` ADD CONSTRAINT `stock_items_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_stock_item_id_fkey` FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
