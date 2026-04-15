-- AlterTable: add parent_job_card_id to job_cards for split job card support
ALTER TABLE `job_cards`
  ADD COLUMN `parent_job_card_id` INT NULL,
  ADD CONSTRAINT `job_cards_parent_job_card_id_fkey`
    FOREIGN KEY (`parent_job_card_id`) REFERENCES `job_cards`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `job_cards_parent_job_card_id_idx` ON `job_cards`(`parent_job_card_id`);
