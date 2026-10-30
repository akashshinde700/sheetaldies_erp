-- Which Tally stock item a process is billed under, when the two systems name
-- it differently. NULL means the process name is used as-is, which is correct
-- for the processes that already exist in Tally under the same name.
ALTER TABLE `process_types`
  ADD COLUMN `tally_stock_item` VARCHAR(150) NULL;
