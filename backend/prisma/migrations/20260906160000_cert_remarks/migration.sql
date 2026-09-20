-- Certificate-level Remarks — a single free-text note on the certificate
-- itself, next to Approved By / Final Inspection By / Cycle No (distinct
-- from the existing per-item `remarks` column on cert_items).

-- AlterTable
ALTER TABLE `test_certificates` ADD COLUMN `remarks` TEXT NULL;
