-- Add item_status to challan_items for explicit allocation tracking
ALTER TABLE `challan_items` ADD COLUMN `item_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING';

-- Backfill: items already assigned to a job card are ASSIGNED
UPDATE `challan_items` SET `item_status` = 'ASSIGNED' WHERE `job_card_id` IS NOT NULL;

-- Indexes for allocation queries
CREATE INDEX `challan_items_item_status_idx` ON `challan_items`(`item_status`);
CREATE INDEX `challan_items_challan_id_item_status_idx` ON `challan_items`(`challan_id`, `item_status`);
