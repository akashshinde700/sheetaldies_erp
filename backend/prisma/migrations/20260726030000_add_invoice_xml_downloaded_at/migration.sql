-- Tracks when an invoice's Tally XML (Option B — manual import) was last
-- downloaded, so the invoice list can show that status without needing a
-- separate "sent to Tally" lock.
ALTER TABLE `tax_invoices`
  ADD COLUMN `xml_downloaded_at` DATETIME(3) NULL AFTER `sent_to_tally_at`;
