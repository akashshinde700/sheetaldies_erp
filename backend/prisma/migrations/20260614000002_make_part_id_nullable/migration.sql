-- Make part_id nullable on job_cards (Part/Item field removed from UI)
ALTER TABLE `job_cards` MODIFY COLUMN `part_id` INT NULL;
