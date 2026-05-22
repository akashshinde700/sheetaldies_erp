-- Rename min_charge to lot_price in process_types and party_process_rates
ALTER TABLE `process_types` RENAME COLUMN `min_charge` TO `lot_price`;
ALTER TABLE `party_process_rates` RENAME COLUMN `min_charge` TO `lot_price`;
