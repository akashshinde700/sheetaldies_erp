-- The certificate form and print both show "Welded" and "Rusty", and the job
-- card inspection records them, but the certificate had nowhere to store them —
-- ticking either was silently lost on save.
ALTER TABLE `test_certificates`
  ADD COLUMN `cat_welded` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `cat_rusty`  BOOLEAN NOT NULL DEFAULT false;
