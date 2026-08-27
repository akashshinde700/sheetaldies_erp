ALTER TABLE `job_cards`
  DROP COLUMN `drawing_no_label`;

ALTER TABLE `challan_items`
  ADD COLUMN `drawing_no_label` VARCHAR(50) NULL AFTER `drawing_no`;
