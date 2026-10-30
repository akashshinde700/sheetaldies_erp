-- Third dispatch mode. The printed job card already listed "COLLECTED BY
-- CUSTOMER", but there was no column behind it, so the box never ticked.
ALTER TABLE `job_cards`
  ADD COLUMN `collected_by_customer` BOOLEAN NOT NULL DEFAULT false;
