-- Add actual_weight_used to job_cards
ALTER TABLE `job_cards`
  ADD COLUMN `actual_weight_used` DECIMAL(10, 3) NULL;

-- Create production_entries table
CREATE TABLE IF NOT EXISTS `production_entries` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `challan_item_id`     INT           NOT NULL,
  `completed_qty`       DECIMAL(12,3) NOT NULL,
  `completed_weight_kg` DECIMAL(10,3) NULL,
  `remarks`             VARCHAR(500)  NULL,
  `created_by`          INT           NULL,
  `created_at`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `idx_prod_entries_challan_item` (`challan_item_id`),
  INDEX `idx_prod_entries_created_at`   (`created_at`),

  CONSTRAINT `production_entries_challan_item_fk`
    FOREIGN KEY (`challan_item_id`)
    REFERENCES `challan_items` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `production_entries_created_by_fk`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
