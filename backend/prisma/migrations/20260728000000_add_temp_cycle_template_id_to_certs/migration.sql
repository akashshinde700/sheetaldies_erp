-- Persist the selected master Temp Cycle Graph on a Test Certificate so the
-- dropdown stays selected on re-edit (the actual curve lives in temp_cycle_data).
ALTER TABLE `test_certificates`
  ADD COLUMN `temp_cycle_template_id` INT NULL AFTER `temp_cycle_data`;
