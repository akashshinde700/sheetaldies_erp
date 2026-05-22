-- AddMissingIndexes
-- dispatch_challans
CREATE INDEX `dispatch_challans_from_party_id_idx` ON `dispatch_challans`(`from_party_id`);
CREATE INDEX `dispatch_challans_to_party_id_idx` ON `dispatch_challans`(`to_party_id`);
CREATE INDEX `dispatch_challans_status_idx` ON `dispatch_challans`(`status`);
CREATE INDEX `dispatch_challans_jobwork_challan_id_idx` ON `dispatch_challans`(`jobwork_challan_id`);

-- audit_logs
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs`(`user_id`);
CREATE INDEX `audit_logs_table_name_created_at_idx` ON `audit_logs`(`table_name`, `created_at`);

-- grns
CREATE INDEX `grns_purchase_order_id_idx` ON `grns`(`purchase_order_id`);

-- grn_items
CREATE INDEX `grn_items_grn_id_idx` ON `grn_items`(`grn_id`);
CREATE INDEX `grn_items_item_id_idx` ON `grn_items`(`item_id`);

-- vht_runsheets
CREATE INDEX `vht_runsheets_batch_id_idx` ON `vht_runsheets`(`batch_id`);

-- heat_treatment_processes
CREATE INDEX `heat_treatment_processes_inspection_id_idx` ON `heat_treatment_processes`(`inspection_id`);
