-- Add cert_status to challan_items (tracks whether item has been certified)
ALTER TABLE `challan_items`
  ADD COLUMN `cert_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING_CERT';

-- Add source link from cert_items back to challan_items
ALTER TABLE `cert_items`
  ADD COLUMN `source_challan_item_id` INT NULL,
  ADD CONSTRAINT `fk_cert_items_challan_item`
    FOREIGN KEY (`source_challan_item_id`) REFERENCES `challan_items`(`id`)
    ON DELETE SET NULL;

-- Indexes
CREATE INDEX `challan_items_cert_status_idx` ON `challan_items`(`cert_status`);
CREATE INDEX `cert_items_source_challan_item_id_idx` ON `cert_items`(`source_challan_item_id`);
