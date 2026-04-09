-- Unique GSTIN per party (multiple NULL gstin still allowed in MySQL).
-- If this fails, remove duplicate gstin rows in `parties` first, then re-apply.

ALTER TABLE `parties` ADD UNIQUE INDEX `parties_gstin_key`(`gstin`);
