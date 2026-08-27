-- Extend temp_cycle_templates into a full reusable "graph master" shared
-- by Test Certificates and VHT Run Sheets: material/process linkage,
-- description, active flag. `data` now stores segments [{tempC,holdMin,label}]
-- instead of flat {time,temp} points (existing rows, if any, are empty at
-- this point in the project's lifecycle, so no data migration needed).
ALTER TABLE `temp_cycle_templates`
  ADD COLUMN `material` VARCHAR(100) NULL,
  ADD COLUMN `process_type_id` INTEGER NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX `temp_cycle_templates_process_type_id_idx` ON `temp_cycle_templates`(`process_type_id`);

ALTER TABLE `temp_cycle_templates` ADD CONSTRAINT `temp_cycle_templates_process_type_id_fkey`
    FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
