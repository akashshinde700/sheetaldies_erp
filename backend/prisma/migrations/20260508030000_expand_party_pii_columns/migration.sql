-- Expand party PII/bank columns to VARCHAR(500) for AES-256-CBC encrypted values
ALTER TABLE `parties`
  MODIFY COLUMN `gstin`                VARCHAR(500) NULL,
  MODIFY COLUMN `pan`                  VARCHAR(500) NULL,
  MODIFY COLUMN `phone`                VARCHAR(500) NULL,
  MODIFY COLUMN `email`                VARCHAR(500) NULL,
  MODIFY COLUMN `bank_account_holder`  VARCHAR(500) NULL,
  MODIFY COLUMN `bank_name`            VARCHAR(500) NULL,
  MODIFY COLUMN `account_no`           VARCHAR(500) NULL,
  MODIFY COLUMN `ifsc_code`            VARCHAR(500) NULL,
  MODIFY COLUMN `swift_code`           VARCHAR(500) NULL,
  MODIFY COLUMN `vat_tin`              VARCHAR(100) NULL,
  MODIFY COLUMN `cst_no`              VARCHAR(100) NULL;
