-- CreateEnum
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (`id` VARCHAR(36) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB;

-- Enum handled inline via VARCHAR in MySQL
-- CustomerQuoteStatus: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED

-- CreateTable: customer_quotes
CREATE TABLE `customer_quotes` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `quote_no`     VARCHAR(50) NOT NULL,
  `customer_id`  INT NOT NULL,
  `quote_date`   DATE NOT NULL,
  `valid_until`  DATE NULL,
  `status`       ENUM('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `subtotal`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `cgst_rate`    DECIMAL(5,2) NOT NULL DEFAULT 9,
  `sgst_rate`    DECIMAL(5,2) NOT NULL DEFAULT 9,
  `cgst`         DECIMAL(12,2) NOT NULL DEFAULT 0,
  `sgst`         DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `notes`        TEXT NULL,
  `payment_terms` VARCHAR(300) NULL,
  `created_by`   INT NOT NULL,
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3) NOT NULL,

  UNIQUE INDEX `customer_quotes_quote_no_key` (`quote_no`),
  INDEX `customer_quotes_customer_id_idx` (`customer_id`),
  INDEX `customer_quotes_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: customer_quote_items
CREATE TABLE `customer_quote_items` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `quote_id`        INT NOT NULL,
  `part_name`       VARCHAR(200) NOT NULL,
  `process_type_id` INT NULL,
  `material`        VARCHAR(100) NULL,
  `qty`             INT NOT NULL DEFAULT 1,
  `weight`          DECIMAL(12,3) NULL,
  `rate`            DECIMAL(12,2) NOT NULL,
  `amount`          DECIMAL(12,2) NOT NULL,
  `hsn_code`        VARCHAR(20) NULL,
  `remarks`         VARCHAR(300) NULL,

  INDEX `customer_quote_items_quote_id_idx` (`quote_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_quotes`
  ADD CONSTRAINT `customer_quotes_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `customer_quotes`
  ADD CONSTRAINT `customer_quotes_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `customer_quote_items`
  ADD CONSTRAINT `customer_quote_items_quote_id_fkey`
    FOREIGN KEY (`quote_id`) REFERENCES `customer_quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `customer_quote_items`
  ADD CONSTRAINT `customer_quote_items_process_type_id_fkey`
    FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
