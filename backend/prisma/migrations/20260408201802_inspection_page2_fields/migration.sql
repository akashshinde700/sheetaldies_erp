/*
  Warnings:

  - You are about to drop the column `mpi_inspection` on the `incoming_inspections` table. All the data in the column will be lost.
  - You are about to drop the column `visual_inspection` on the `incoming_inspections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `heat_treatment_processes` ADD COLUMN `loading_by` VARCHAR(100) NULL,
    ADD COLUMN `process_date` DATE NULL,
    ADD COLUMN `temp_time` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `incoming_inspections` DROP COLUMN `mpi_inspection`,
    DROP COLUMN `visual_inspection`,
    ADD COLUMN `cat_rusty` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cat_welded` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hardness_after_1` DECIMAL(6, 2) NULL,
    ADD COLUMN `hardness_after_2` DECIMAL(6, 2) NULL,
    ADD COLUMN `hardness_after_3` DECIMAL(6, 2) NULL,
    ADD COLUMN `hardness_after_4` DECIMAL(6, 2) NULL,
    ADD COLUMN `mpi_after` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mpi_before` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mpi_nil` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `urgent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `visual_after` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `visual_before` BOOLEAN NOT NULL DEFAULT false;
