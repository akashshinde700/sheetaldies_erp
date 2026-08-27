ALTER TABLE `job_cards`
  ADD COLUMN `show_drawing_no_in_print` BOOLEAN NOT NULL DEFAULT true AFTER `drawing_no`,
  ADD COLUMN `drawing_no_label` VARCHAR(50) NULL AFTER `show_drawing_no_in_print`;
