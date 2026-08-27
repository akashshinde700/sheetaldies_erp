-- Lets party-facing rate screens (party creation, party rates matrix) show
-- only billable service processes, while Job Card's Heat Treatment Process
-- table still lists every process (including cycle sub-steps like Hardening,
-- 1st/2nd/3rd/4th Tempering).
ALTER TABLE `process_types` ADD COLUMN `show_in_party_rates` BOOLEAN NOT NULL DEFAULT true;

-- Codes 11-17 are Heat Treatment Process cycle sub-steps (Hardening,
-- 1st/2nd/3rd/4th Tempering, Aging, Cryogenic), not billable party services.
UPDATE `process_types` SET `show_in_party_rates` = false WHERE `code` IN ('11','12','13','14','15','16','17');
