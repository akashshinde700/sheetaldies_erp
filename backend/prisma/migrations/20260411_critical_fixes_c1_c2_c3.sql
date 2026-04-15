-- Migration to add InvoiceSequence table for atomic invoice number generation
-- ✅ CRITICAL FIX C1: Fixes race condition in invoice numbering

-- CreateTable InvoiceSequence
CREATE TABLE IF NOT EXISTS `invoiceSequence` (
  `prefix` VARCHAR(50) NOT NULL PRIMARY KEY,
  `nextValue` BIGINT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_nextValue` (`nextValue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add version field to major tables for optimistic locking
-- ✅ CRITICAL FIX C2: Helps prevent overbilling via concurrent updates

ALTER TABLE `taxInvoices` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `dispatchChallans` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `jobcards` ADD COLUMN `version` INT NOT NULL DEFAULT 1;

-- Add constraints to prevent invalid quantities
-- ✅ HIGH FIX H3: Prevents negative quantities

ALTER TABLE `invoiceItems` ADD CONSTRAINT `ck_invoice_items_qty_positive` CHECK (`quantity` > 0);
ALTER TABLE `dispatchItems` ADD CONSTRAINT `ck_dispatch_items_qty_positive` CHECK (`quantity` > 0);
ALTER TABLE `jobcardItems` ADD CONSTRAINT `ck_jobcard_items_qty_positive` CHECK (`quantity` > 0);

-- Add indexes for foreign key performance
-- ✅ HIGH FIX H7: Improves query performance

CREATE INDEX `idx_invoiceItems_invoiceId` ON `invoiceItems`(`invoiceId`);
CREATE INDEX `idx_invoiceItems_sourceChallItemId` ON `invoiceItems`(`sourceChallItemId`);
CREATE INDEX `idx_dispatchItems_dispatId` ON `dispatchItems`(`dispatchId`);
CREATE INDEX `idx_dispatchItems_sourceChallanItemId` ON `dispatchItems`(`sourceChallanItemId`);
CREATE INDEX `idx_taxInvoices_fromPartyId` ON `taxInvoices`(`fromPartyId`);
CREATE INDEX `idx_taxInvoices_challanId` ON `taxInvoices`(`sourceDispatchChallanId`);
CREATE INDEX `idx_dispatchChallans_jobcardId` ON `dispatchChallans`(`jobcardId`);

-- Create audit log table for sensitive operations
-- ✅ HIGH FIX H4: Enables audit trail for compliance

CREATE TABLE IF NOT EXISTS `auditLogs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `userId` INT,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(50) NOT NULL,
  `entityId` INT,
  `before` JSON,
  `after` JSON,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_action` (`action`),
  INDEX `idx_entity` (`entity`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
