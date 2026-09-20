-- Same-process consolidation: one InvoiceItem can now be billed from several
-- ChallanItems (e.g. two challan lines both "HARDENING & TEMPERING" become
-- one invoice row with combined quantity), while still tracking exactly how
-- much of EACH source challan item was invoiced — so partial-billing /
-- remaining-qty accounting stays correct per challan item.
--
-- Non-destructive: invoice_items.source_challan_item_id is untouched, so
-- every existing invoice keeps rendering and billing exactly as before.
-- New consolidated invoices additionally populate invoice_item_sources;
-- old single-source invoices are never backfilled into it.

-- CreateTable
CREATE TABLE `invoice_item_sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_item_id` INTEGER NOT NULL,
    `challan_item_id` INTEGER NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,

    INDEX `invoice_item_sources_invoice_item_id_idx`(`invoice_item_id`),
    INDEX `invoice_item_sources_challan_item_id_idx`(`challan_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoice_item_sources` ADD CONSTRAINT `invoice_item_sources_invoice_item_id_fkey` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_item_sources` ADD CONSTRAINT `invoice_item_sources_challan_item_id_fkey` FOREIGN KEY (`challan_item_id`) REFERENCES `challan_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
