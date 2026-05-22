ALTER TABLE `jobwork_challans` ADD COLUMN `inward_no` VARCHAR(50) NULL;
ALTER TABLE `jobwork_challans` ADD UNIQUE INDEX `jobwork_challans_inward_no_key`(`inward_no`);
