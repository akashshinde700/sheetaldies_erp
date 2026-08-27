-- incoming_inspections: hardness fields → string
ALTER TABLE `incoming_inspections`
  MODIFY COLUMN `hardness_unit`    VARCHAR(20) NOT NULL DEFAULT 'HRC',
  MODIFY COLUMN `achieved_hardness` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_1` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_2` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_3` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_4` VARCHAR(50) NULL;

-- test_certificates: hardness fields → string
ALTER TABLE `test_certificates`
  MODIFY COLUMN `hardness_unit`    VARCHAR(20) NOT NULL DEFAULT 'HRC',
  MODIFY COLUMN `hardness_after_1` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_2` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_3` VARCHAR(50) NULL,
  MODIFY COLUMN `hardness_after_4` VARCHAR(50) NULL;
