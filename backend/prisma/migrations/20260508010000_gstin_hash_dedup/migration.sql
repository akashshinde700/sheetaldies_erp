-- Fix GSTIN/PAN dedup: store deterministic SHA-256 hash so unique constraint works
-- (the encrypted values use random IV so each encryption is different)
ALTER TABLE `parties` ADD COLUMN `gstin_hash` VARCHAR(64) NULL;
ALTER TABLE `parties` ADD COLUMN `pan_hash` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `parties_gstin_hash_key` ON `parties`(`gstin_hash`);
CREATE UNIQUE INDEX `parties_pan_hash_key` ON `parties`(`pan_hash`);
-- Drop old unique constraints on the encrypted columns (they were never effective)
ALTER TABLE `parties` DROP INDEX `parties_gstin_key`;
ALTER TABLE `parties` DROP INDEX `parties_pan_key`;
