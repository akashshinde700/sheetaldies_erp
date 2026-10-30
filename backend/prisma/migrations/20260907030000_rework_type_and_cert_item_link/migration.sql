-- AlterTable: distinguish Rework (redo-able) from Reject (scrapped)
ALTER TABLE `rework_entries` ADD COLUMN `type` ENUM('REWORK', 'REJECT') NOT NULL DEFAULT 'REWORK';

-- AlterTable: link a rework/reject entry back to the specific cert item line
ALTER TABLE `rework_entries` ADD COLUMN `cert_item_id` INTEGER NULL;
CREATE INDEX `rework_entries_cert_item_id_idx` ON `rework_entries`(`cert_item_id`);

-- AddForeignKey
ALTER TABLE `rework_entries` ADD CONSTRAINT `rework_entries_cert_item_id_fkey` FOREIGN KEY (`cert_item_id`) REFERENCES `cert_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
