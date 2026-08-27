ALTER TABLE `test_certificates`
  ADD COLUMN `visual_before` BOOLEAN NOT NULL DEFAULT false AFTER `proc_soak_clean`,
  ADD COLUMN `visual_after` BOOLEAN NOT NULL DEFAULT true AFTER `visual_before`,
  ADD COLUMN `mpi_before` BOOLEAN NOT NULL DEFAULT false AFTER `visual_after`,
  ADD COLUMN `mpi_after` BOOLEAN NOT NULL DEFAULT false AFTER `mpi_before`,
  ADD COLUMN `mpi_nil` BOOLEAN NOT NULL DEFAULT true AFTER `mpi_after`;
