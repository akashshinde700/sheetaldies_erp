-- ============================================================
-- SHEETAL DIES ERP — TRUNCATE + SEED FROM REAL DOCUMENTS
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE attachments;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE cert_inspection_results;
TRUNCATE TABLE cert_items;
TRUNCATE TABLE challan_items;
TRUNCATE TABLE customer_quote_items;
TRUNCATE TABLE customer_quotes;
TRUNCATE TABLE daily_idle_logs;
TRUNCATE TABLE dispatch_challan_items;
TRUNCATE TABLE dispatch_challans;
TRUNCATE TABLE furnace_plan_days;
TRUNCATE TABLE furnace_plan_slots;
TRUNCATE TABLE furnace_utilization_days;
TRUNCATE TABLE grn_items;
TRUNCATE TABLE grns;
TRUNCATE TABLE heat_treatment_processes;
TRUNCATE TABLE incoming_inspections;
TRUNCATE TABLE inventories;
TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE invoice_items;
TRUNCATE TABLE items;
TRUNCATE TABLE job_cards;
TRUNCATE TABLE job_step_tracking;
TRUNCATE TABLE job_workflows;
TRUNCATE TABLE jobwork_challans;
TRUNCATE TABLE machines;
TRUNCATE TABLE manufacturing_batch_jobcards;
TRUNCATE TABLE manufacturing_batches;
TRUNCATE TABLE parties;
TRUNCATE TABLE plant_loss_entries;
TRUNCATE TABLE plant_loss_months;
TRUNCATE TABLE process_types;
TRUNCATE TABLE production_plans;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE quote_items;
TRUNCATE TABLE shifts;
TRUNCATE TABLE supplier_quotes;
TRUNCATE TABLE tax_invoices;
TRUNCATE TABLE test_certificates;
TRUNCATE TABLE vht_runsheet_items;
TRUNCATE TABLE vht_runsheets;
TRUNCATE TABLE workflow_steps;
TRUNCATE TABLE workflow_templates;
TRUNCATE TABLE workflow_transitions;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. PARTIES
-- ============================================================
INSERT INTO parties (id, name, party_code, address, city, state, pin_code, gstin, state_code, phone, email, party_type, is_active, created_at, updated_at) VALUES
(1, 'SHEETAL DIES & TOOLS PVT. LTD.', 'SDT001',
 'Plot No. 84/2, Sector No. 10, OM Sai Industrial Premises Co.Op.Soc., PCNTDA, Bhosari, Pune - 411026',
 'Pune', 'Maharashtra', '411026', '27AANCS2087B1ZA', '27', '09822012850', 'info@sheetaldies.in',
 'CUSTOMER', 1, NOW(), NOW()),
(2, 'SHITAL VACUUM TREAT PVT. LTD.', 'SVT001',
 'Plot No. 84/1, Sector No. 10, PCNTDA, Bhosari, Pune - 411026',
 'Pune', 'Maharashtra', '411026', '27AATCS0577L1ZK', '27', NULL, 'info@shitalvacuumtreat.com',
 'BOTH', 1, NOW(), NOW());

-- ============================================================
-- 2. PROCESS TYPES
-- ============================================================
INSERT INTO process_types (id, code, name, description, hsn_sac_code, price_per_kg, min_charge, gst_rate, is_active, updated_by, created_at, updated_at) VALUES
(2, 'HRD', 'Hardening',        'Vacuum hardening only',      '998898',  80.00, 400.00, 18.00, 1, 1, NOW(), NOW()),
(3, 'TMP', 'Tempering',        'Tempering cycle',            '998898',  50.00, 300.00, 18.00, 1, 1, NOW(), NOW()),
(4, 'SR',  'Stress Relieving', 'Stress relieving process',  '998898',  60.00, 350.00, 18.00, 1, 1, NOW(), NOW()),
(5, 'ANN', 'Annealing',        'Annealing process',         '998898',  NULL,  NULL,   18.00, 1, 1, NOW(), NOW()),
(6, 'BRZ', 'Brazing',          'Brazing process',           '998898',  NULL,  NULL,   18.00, 1, 1, NOW(), NOW()),
(7, 'PN',  'Plasma Nitriding', 'Plasma nitriding process',  '998898',  NULL,  NULL,   18.00, 1, 1, NOW(), NOW()),
(8, 'SZ',  'Sub Zero',         'Sub zero treatment',        '998898',  NULL,  NULL,   18.00, 1, 1, NOW(), NOW()),
(9, 'SC',  'Soak Clean',       'Soak cleaning process',     '998898',  NULL,  NULL,   18.00, 1, 1, NOW(), NOW());

-- ============================================================
-- 3. ITEMS / PARTS
-- ============================================================
INSERT INTO items (id, part_no, description, hsn_code, material, unit, weight_kg, is_active, created_at, updated_at) VALUES
(1, 'BRF-001', 'BOTTOM ROLLER FLANGE', '998898', 'D2', 'NOS', 40.800, 1, NOW(), NOW()),
(2, 'FLR-R-001', 'FLR RIGHT', '998898', 'D2', 'NOS', 5.000, 1, NOW(), NOW()),
(3, 'GW-001', 'GEAR AND WASHER', '998898', 'EN31', 'NOS', 5.700, 1, NOW(), NOW()),
(4, 'HI-001', 'HUB INSERT', '998898', 'D2', 'NOS', NULL, 1, NOW(), NOW()),
(5, 'ANX-001', 'ANNEX', '998898', 'HSS', 'NOS', 9.000, 1, NOW(), NOW());

-- ============================================================
-- 4. MACHINES
-- ============================================================
INSERT INTO machines (id, code, name, type, make, is_active, created_at) VALUES
(1, 'VPT-01', 'Vacuum Furnace 1', 'Vacuum Furnace', 'VPT', 1, NOW()),
(2, 'VPT-02', 'Vacuum Furnace 2', 'Vacuum Furnace', 'VPT', 1, NOW());

-- ============================================================
-- 5. JOBWORK CHALLAN — SDT/CH/2025/001, date 2025-11-08
-- from: Sheetal Dies (1), to: Shital Vacuum Treat (2)
-- subtotal=6300, CGST9%=567, SGST9%=567, grand_total=7434
-- ============================================================
INSERT INTO jobwork_challans (id, challan_no, challan_date, from_party_id, to_party_id,
  subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount, grand_total,
  status, created_by, created_at, updated_at) VALUES
(1, 'SDT/CH/2025/001', '2025-11-08', 1, 2,
  6300.00, 9.00, 567.00, 9.00, 567.00, 7434.00,
  'COMPLETED', 1, NOW(), NOW());

INSERT INTO challan_items (id, challan_id, item_id, description, material, hrc, hsn_code,
  quantity, uom, weight, rate, amount, process_type_id, process_name) VALUES
(1, 1, 1, 'BOTTOM ROLLER FLANGE', 'D2', '54-56 HRC', '998898',
  2, 'NOS', 40.800, 100.00, 4080.00, 1, 'Hardening + Tempering'),
(2, 1, 2, 'FLR RIGHT', 'D2', '42-44 HRC', '998898',
  2, 'NOS', 5.000, 100.00, 500.00, 1, 'Hardening + Tempering'),
(3, 1, 3, 'GEAR AND WASHER', 'EN31', '48-50 HRC', '998898',
  6, 'NOS', 5.700, 100.00, 570.00, 1, 'Hardening + Tempering'),
(4, 1, 4, 'HUB INSERT', 'D2', NULL, '998898',
  1, 'NOS', NULL, 150.00, 150.00, 2, 'Hardening'),
(5, 1, 5, 'ANNEX', 'HSS', '58-60 HRC', '998898',
  1, 'NOS', 9.000, 100.00, 900.00, 1, 'Hardening + Tempering');

-- ============================================================
-- 6. JOB CARDS (4 — from scanned job card images)
-- ============================================================
INSERT INTO job_cards (id, job_card_no, die_material, part_id, customer_id, machine_id,
  quantity, total_weight, hrc_range, status,
  start_date, received_date, end_date,
  customer_name_snapshot, factory_name,
  created_by, created_at, updated_at) VALUES
(1, '2408423', 'D2', 1, 1, 1,
  2, 40.800, '54-56', 'COMPLETED',
  '2025-11-08', '2025-11-08', '2025-11-15',
  'SHEETAL DIES & TOOLS PVT. LTD.', 'SHITAL VACUUM TREAT PVT. LTD.',
  1, NOW(), NOW()),
(2, '2408424', 'EN31', 3, 1, 1,
  6, 5.700, '48-50', 'COMPLETED',
  '2025-11-08', '2025-11-08', '2025-11-15',
  'SHEETAL DIES & TOOLS PVT. LTD.', 'SHITAL VACUUM TREAT PVT. LTD.',
  1, NOW(), NOW()),
(3, '2408425', 'D2', 2, 1, 1,
  2, 5.000, '42-44', 'COMPLETED',
  '2025-11-08', '2025-11-08', '2025-11-15',
  'SHEETAL DIES & TOOLS PVT. LTD.', 'SHITAL VACUUM TREAT PVT. LTD.',
  1, NOW(), NOW()),
(4, '2408426', 'HSS', 5, 1, 1,
  1, 9.000, '58-60', 'COMPLETED',
  '2025-11-08', '2025-11-08', '2025-11-15',
  'SHEETAL DIES & TOOLS PVT. LTD.', 'SHITAL VACUUM TREAT PVT. LTD.',
  1, NOW(), NOW());

-- ============================================================
-- 7. INCOMING INSPECTIONS (1 per job card)
-- ============================================================
INSERT INTO incoming_inspections (id, job_card_id, cat_normal, proc_hardening, proc_tempering,
  required_hardness_min, required_hardness_max, hardness_unit,
  inspection_status, inspection_date, created_at, updated_at) VALUES
(1, 1, 1, 1, 1, 54, 56, 'HRC', 'PASS', '2025-11-08', NOW(), NOW()),
(2, 2, 1, 1, 1, 48, 50, 'HRC', 'PASS', '2025-11-08', NOW(), NOW()),
(3, 3, 1, 1, 1, 42, 44, 'HRC', 'PASS', '2025-11-08', NOW(), NOW()),
(4, 4, 1, 1, 1, 58, 60, 'HRC', 'PASS', '2025-11-08', NOW(), NOW());

-- ============================================================
-- 8. VHT RUNSHEET — VPT/RS/25-26/001, run date 2025-11-12
-- ============================================================
INSERT INTO vht_runsheets (id, runsheet_number, furnace_id, run_date, status,
  hardening_type, cycle_time, temp_profile, loading_operator_name,
  created_by, created_at, updated_at) VALUES
(1, 'VPT/RS/25-26/001', 1, '2025-11-12', 'COMPLETED',
  'Vacuum Hardening', 240,
  '800C Preheat > 1020C Hardening > Gas Quench > 200C Temper',
  'Operator', 1, NOW(), NOW());

INSERT INTO vht_runsheet_items (id, runsheet_id, item_id, job_card_id,
  quantity, weight_kg, hrc_required, customer_name, job_description, material_grade) VALUES
(1, 1, 1, 1, 2, 40.800, '54-56 HRC', 'SHEETAL DIES & TOOLS PVT. LTD.', 'BOTTOM ROLLER FLANGE', 'D2'),
(2, 1, 3, 2, 6, 5.700,  '48-50 HRC', 'SHEETAL DIES & TOOLS PVT. LTD.', 'GEAR AND WASHER', 'EN31'),
(3, 1, 2, 3, 2, 5.000,  '42-44 HRC', 'SHEETAL DIES & TOOLS PVT. LTD.', 'FLR RIGHT', 'D2'),
(4, 1, 5, 4, 1, 9.000,  '58-60 HRC', 'SHEETAL DIES & TOOLS PVT. LTD.', 'ANNEX', 'HSS');

-- ============================================================
-- 9. TEST CERTIFICATES (4 — from scanned certificate images)
-- ============================================================
INSERT INTO test_certificates (id, cert_no, job_card_id, customer_id,
  hardness_min, hardness_max, hardness_unit,
  proc_hardening, proc_tempering,
  issue_date, status, created_by, created_at, updated_at) VALUES
(1, 'SVT/2025/001', 1, 1, 54, 56, 'HRC', 1, 1, '2025-11-15', 'ISSUED', 1, NOW(), NOW()),
(2, 'SVT/2025/002', 2, 1, 48, 50, 'HRC', 1, 1, '2025-11-15', 'ISSUED', 1, NOW(), NOW()),
(3, 'SVT/2025/003', 3, 1, 42, 44, 'HRC', 1, 1, '2025-11-15', 'ISSUED', 1, NOW(), NOW()),
(4, 'SVT/2025/004', 4, 1, 58, 60, 'HRC', 1, 1, '2025-11-15', 'ISSUED', 1, NOW(), NOW());

-- ============================================================
-- 10. TAX INVOICE — SVH/INV/25-26/0001, date 2026-03-24
-- from: SVT (2), to: Sheetal Dies (1)
-- ============================================================
INSERT INTO tax_invoices (id, invoice_no, invoice_date, from_party_id, to_party_id,
  challan_id, challan_ref,
  subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
  total_amount, grand_total,
  amount_in_words, payment_status, created_by, created_at, updated_at) VALUES
(1, 'SVH/INV/25-26/0001', '2026-03-24', 2, 1,
  1, 'SDT/CH/2025/001',
  6300.00, 9.00, 567.00, 9.00, 567.00, 0.00, 0.00,
  7434.00, 7434.00,
  'Seven Thousand Four Hundred Thirty Four Rupees Only',
  'PENDING', 1, NOW(), NOW());

INSERT INTO invoice_items (id, invoice_id, cert_id, description, material, hrc,
  hsn_sac, quantity, unit, weight, rate, amount, process_type_id, source_challan_item_id) VALUES
(1, 1, 1, 'BOTTOM ROLLER FLANGE - Hardening + Tempering', 'D2', '54-56 HRC',
  '998898', 2, 'NOS', 40.800, 100.00, 4080.00, 1, 1),
(2, 1, 3, 'FLR RIGHT - Hardening + Tempering', 'D2', '42-44 HRC',
  '998898', 2, 'NOS', 5.000, 100.00, 500.00, 1, 2),
(3, 1, 2, 'GEAR AND WASHER - Hardening + Tempering', 'EN31', '48-50 HRC',
  '998898', 6, 'NOS', 5.700, 100.00, 570.00, 1, 3),
(4, 1, NULL, 'HUB INSERT - Hardening', 'D2', NULL,
  '998898', 1, 'NOS', NULL, 150.00, 150.00, 2, 4),
(5, 1, 4, 'ANNEX - Hardening + Tempering', 'HSS', '58-60 HRC',
  '998898', 1, 'NOS', 9.000, 100.00, 900.00, 1, 5);

-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'parties' AS tbl, COUNT(*) AS cnt FROM parties
UNION ALL SELECT 'process_types', COUNT(*) FROM process_types
UNION ALL SELECT 'items', COUNT(*) FROM items
UNION ALL SELECT 'machines', COUNT(*) FROM machines
UNION ALL SELECT 'jobwork_challans', COUNT(*) FROM jobwork_challans
UNION ALL SELECT 'challan_items', COUNT(*) FROM challan_items
UNION ALL SELECT 'job_cards', COUNT(*) FROM job_cards
UNION ALL SELECT 'incoming_inspections', COUNT(*) FROM incoming_inspections
UNION ALL SELECT 'vht_runsheets', COUNT(*) FROM vht_runsheets
UNION ALL SELECT 'vht_runsheet_items', COUNT(*) FROM vht_runsheet_items
UNION ALL SELECT 'test_certificates', COUNT(*) FROM test_certificates
UNION ALL SELECT 'tax_invoices', COUNT(*) FROM tax_invoices
UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL SELECT 'users (untouched)', COUNT(*) FROM users;
