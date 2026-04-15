-- AddColumn: process_type_id and process_name to challan_items
ALTER TABLE `challan_items`
  ADD COLUMN `process_type_id` INT NULL,
  ADD COLUMN `process_name` VARCHAR(150) NULL,
  ADD INDEX `challan_items_process_type_id_idx` (`process_type_id`),
  ADD CONSTRAINT `challan_items_process_type_id_fkey`
    FOREIGN KEY (`process_type_id`) REFERENCES `process_types` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
