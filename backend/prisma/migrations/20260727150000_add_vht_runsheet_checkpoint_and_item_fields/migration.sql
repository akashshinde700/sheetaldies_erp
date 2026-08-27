-- Check Points section fields on the VHT run sheet (filled in as the cycle runs).
ALTER TABLE `vht_runsheets`
  ADD COLUMN `gas_pressure`           VARCHAR(50)  NULL AFTER `verification_note`,
  ADD COLUMN `water_circulation_from` VARCHAR(20)  NULL AFTER `gas_pressure`,
  ADD COLUMN `water_circulation_to`   VARCHAR(20)  NULL AFTER `water_circulation_from`,
  ADD COLUMN `power_failure_from`     VARCHAR(20)  NULL AFTER `water_circulation_to`,
  ADD COLUMN `power_failure_to`       VARCHAR(20)  NULL AFTER `power_failure_from`,
  ADD COLUMN `other_checkpoint`       TEXT         NULL AFTER `power_failure_to`;

-- Per-item paper-form columns: fixture used, thermocouple position, instruction.
ALTER TABLE `vht_runsheet_items`
  ADD COLUMN `fixtures`     VARCHAR(150) NULL AFTER `planned_slot`,
  ADD COLUMN `tc_position`  VARCHAR(100) NULL AFTER `fixtures`,
  ADD COLUMN `instruction`  VARCHAR(300) NULL AFTER `tc_position`;
