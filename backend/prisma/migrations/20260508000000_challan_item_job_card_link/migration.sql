-- Add job_card_id to challan_items so each item can link to its own job card
ALTER TABLE `challan_items` ADD COLUMN `job_card_id` INT NULL;
ALTER TABLE `challan_items` ADD CONSTRAINT `challan_items_job_card_id_fkey`
  FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `challan_items_job_card_id_idx` ON `challan_items`(`job_card_id`);
