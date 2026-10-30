-- Composite index: pending items queries (challanId + jobCardId)
CREATE INDEX `challan_items_challan_id_job_card_id_idx`
  ON `challan_items` (`challan_id`, `job_card_id`);

-- Composite index: production entry history (time-series)
CREATE INDEX `production_entries_challan_item_id_created_at_idx`
  ON `production_entries` (`challan_item_id`, `created_at`);

-- Composite index: invoice aging
CREATE INDEX `tax_invoices_payment_status_created_at_idx`
  ON `tax_invoices` (`payment_status`, `created_at`);

-- Job card date-range queries
CREATE INDEX `job_cards_created_at_idx`
  ON `job_cards` (`created_at`);

CREATE INDEX `job_cards_status_created_at_idx`
  ON `job_cards` (`status`, `created_at`);

-- Inward date-range and customer-filtered queries
CREATE INDEX `jobwork_challans_challan_date_idx`
  ON `jobwork_challans` (`challan_date`);

CREATE INDEX `jobwork_challans_from_party_id_status_idx`
  ON `jobwork_challans` (`from_party_id`, `status`);
