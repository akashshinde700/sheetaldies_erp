-- AlterTable
ALTER TABLE `invoice_items` ADD COLUMN `source_challan_item_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_source_challan_item_id_fkey` FOREIGN KEY (`source_challan_item_id`) REFERENCES `challan_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
