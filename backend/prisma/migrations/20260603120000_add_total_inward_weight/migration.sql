-- Add total_inward_weight to jobwork_challans
ALTER TABLE `jobwork_challans`
  ADD COLUMN `total_inward_weight` DECIMAL(10, 3) NULL;
