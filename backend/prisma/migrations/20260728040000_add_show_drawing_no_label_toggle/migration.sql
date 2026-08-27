ALTER TABLE `job_cards`
  ADD COLUMN `show_drawing_no_label_in_print` BOOLEAN NOT NULL DEFAULT true AFTER `show_drawing_no_in_print`;
