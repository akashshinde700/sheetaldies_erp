-- ============================================================
-- SHEETAL DIES & TOOLS PVT. LTD. - ERP DATABASE SCHEMA
-- Database: MySQL 8.0+
-- ORM: Prisma
-- ============================================================
-- IMPORTANT:
-- - This file is a FULL BOOTSTRAP script (intended for fresh/empty database setup).
-- - Do NOT run this whole file on an already-running/live database.
-- - For existing database upgrades/sync, use: database/schema-live-sync.sql
-- - Running this file on live DB can fail with "table already exists" / duplicate constraints.

CREATE DATABASE IF NOT EXISTS sheetal_dies_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sheetal_dies_erp;

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','MANAGER','OPERATOR','VIEWER') NOT NULL DEFAULT 'OPERATOR',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  otp_token     VARCHAR(10),
  otp_expiry    DATETIME,
  last_login    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. MASTERS
-- ============================================================

-- Parties (Customers & Vendors)
CREATE TABLE parties (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(200) NOT NULL,
  party_code           VARCHAR(50) UNIQUE,
  address              TEXT NOT NULL,
  city                 VARCHAR(100),
  state                VARCHAR(100),
  pin_code             VARCHAR(10),
  gstin                VARCHAR(20),
  pan                  VARCHAR(20),
  state_code           VARCHAR(5),
  phone                VARCHAR(20),
  email                VARCHAR(150),
  party_type           ENUM('CUSTOMER','VENDOR','BOTH') NOT NULL DEFAULT 'CUSTOMER',
  vat_tin              VARCHAR(30),
  cst_no               VARCHAR(30),
  bank_account_holder  VARCHAR(200),
  bank_name            VARCHAR(200),
  account_no           VARCHAR(50),
  ifsc_code            VARCHAR(20),
  swift_code           VARCHAR(20),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items / Parts / Dies
CREATE TABLE items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  part_no       VARCHAR(100) NOT NULL UNIQUE,
  description   VARCHAR(300) NOT NULL,
  hsn_code      VARCHAR(20),
  material      VARCHAR(100),
  drawing_no    VARCHAR(100),
  unit          VARCHAR(20) NOT NULL DEFAULT 'NOS',
  weight_kg     DECIMAL(10,3),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Machines
CREATE TABLE machines (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  type          VARCHAR(100),   -- VMC, CNC, Radial Drill, Conventional
  make          VARCHAR(100),   -- BFW, Mazak, Haas
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Process Types (Admin manageable prices) - Image 3.1
CREATE TABLE process_types (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,   -- Vacuum Heat Treatment, Plasma Nitriding, etc.
  description     TEXT,
  hsn_sac_code    VARCHAR(20),
  price_per_kg    DECIMAL(10,2),           -- Admin sets this
  price_per_pc    DECIMAL(10,2),           -- Admin sets this
  min_charge      DECIMAL(10,2),
  gst_rate        DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by      INT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default process types
-- Prices are placeholder — Admin can change from Pricing & Rules panel
INSERT IGNORE INTO process_types (code, name, description, hsn_sac_code, price_per_kg, price_per_pc, min_charge, gst_rate) VALUES
('SR',   'Stress Relieving',   'Stress relieving to remove residual stresses without change in hardness',    '998898',  80.00, NULL, 400.00, 18.00),
('HRD',  'Hardening',          'Austenitizing and quenching to achieve required hardness',                   '998898', 120.00, NULL, 500.00, 18.00),
('TMP',  'Tempering',          'Tempering after hardening to achieve toughness at required HRC',             '998898',  60.00, NULL, 300.00, 18.00),
('ANN',  'Annealing',          'Full annealing - softening, stress relief and grain refinement',             '998898',  90.00, NULL, 400.00, 18.00),
('BRZ',  'Brazing',            'High temperature vacuum brazing of tool steel components',                   '998898', 200.00, NULL, 600.00, 18.00),
('PN',   'Plasma Nitriding',   'Plasma / Ion nitriding for surface hardness and wear resistance',            '998898', 180.00, NULL, 800.00, 18.00),
('NIT',  'Nitriding',          'Gas nitriding process for surface hardening and fatigue life',               '998898', 160.00, NULL, 700.00, 18.00),
('SZ',   'Sub Zero',           'Sub-zero / cryogenic treatment at -80C to -196C after hardening',           '998898', 220.00, NULL, 700.00, 18.00),
('SC',   'Soak Clean',         'Pre/post process soak cleaning to remove oils, scales and contaminants',     '998898',  40.00, NULL, 250.00, 18.00),
('SLC',  'Slow Cool',          'Controlled slow cooling cycle to reduce thermal stress and cracking',        '998898',  55.00, NULL, 300.00, 18.00);

-- ============================================================
-- 3. JOB CARDS - Image 3 & 3.1
-- ============================================================
CREATE TABLE job_cards (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  job_card_no     VARCHAR(50) NOT NULL UNIQUE,
  die_no          VARCHAR(50),
  your_no         VARCHAR(50),
  heat_no         VARCHAR(50),
  die_material    VARCHAR(100),
  part_id         INT NOT NULL,
  customer_id     INT,
  operation_no    VARCHAR(50),
  drawing_no      VARCHAR(100),
  machine_id      INT,
  operator_name   VARCHAR(100),
  quantity        INT NOT NULL,
  total_weight    DECIMAL(10,3),
  time_taken      DECIMAL(8,2),        -- hours
  start_date      DATE,
  received_date   DATE,
  due_date        DATE,
  end_date        DATE,
  operation_mode  VARCHAR(30),
  status          ENUM('CREATED','IN_PROGRESS','SENT_FOR_JOBWORK','INSPECTION','COMPLETED','ON_HOLD') NOT NULL DEFAULT 'CREATED',
  remarks         TEXT,
  
  -- 5 Part Images
  image1          VARCHAR(255),
  image2          VARCHAR(255),
  image3          VARCHAR(255),
  image4          VARCHAR(255),
  image5          VARCHAR(255),
  
  created_by      INT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_id)     REFERENCES items(id),
  FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id)  REFERENCES machines(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

-- ============================================================
-- 4. INCOMING INSPECTION - Image 3.1
-- ============================================================
CREATE TABLE incoming_inspections (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  job_card_id           INT NOT NULL UNIQUE,

  -- Final Inspection Categorization (exact from quality test.jpeg)
  cat_normal            BOOLEAN NOT NULL DEFAULT FALSE,
  cat_crack_risk        BOOLEAN NOT NULL DEFAULT FALSE,
  cat_distortion_risk   BOOLEAN NOT NULL DEFAULT FALSE,
  cat_critical_finishing BOOLEAN NOT NULL DEFAULT FALSE,
  cat_dent_damage       BOOLEAN NOT NULL DEFAULT FALSE,
  cat_cavity            BOOLEAN NOT NULL DEFAULT FALSE,
  cat_others            BOOLEAN NOT NULL DEFAULT FALSE,
  other_defects         VARCHAR(300),

  -- Process Type Selected (Image 3.1 right side)
  process_type_id       INT,
  -- Sub-processes checkboxes
  proc_stress_relieving  BOOLEAN NOT NULL DEFAULT FALSE,
  proc_hardening         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_tempering         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_annealing         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_brazing           BOOLEAN NOT NULL DEFAULT FALSE,
  proc_plasma_nitriding  BOOLEAN NOT NULL DEFAULT FALSE,
  proc_nitriding         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_sub_zero          BOOLEAN NOT NULL DEFAULT FALSE,
  proc_soak_clean        BOOLEAN NOT NULL DEFAULT FALSE,
  proc_slow_cool         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Inspection Methods
  visual_inspection      BOOLEAN NOT NULL DEFAULT FALSE,
  mpi_inspection         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Hardness Requirements
  required_hardness_min  DECIMAL(6,2),
  required_hardness_max  DECIMAL(6,2),
  hardness_unit          VARCHAR(10) NOT NULL DEFAULT 'HRC',
  achieved_hardness      DECIMAL(6,2),

  -- Distortion - up to 8 points (JSON arrays)
  distortion_points_before  JSON,  -- [{"pt":1,"val":0.02}, ...]
  distortion_points_after   JSON,

  -- 5 Part Images (multer upload paths)
  image1                VARCHAR(255),
  image2                VARCHAR(255),
  image3                VARCHAR(255),
  image4                VARCHAR(255),
  image5                VARCHAR(255),

  packed_qty            INT,
  packed_by             VARCHAR(100),
  incoming_inspection_by VARCHAR(100),
  final_inspection_by   VARCHAR(100),
  inspected_by          VARCHAR(100),
  inspection_date       DATE,
  remarks               TEXT,
  inspection_status     ENUM('PENDING','PASS','FAIL','CONDITIONAL') NOT NULL DEFAULT 'PENDING',

  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id)     REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (process_type_id) REFERENCES process_types(id) ON DELETE SET NULL
);

-- ============================================================
-- 5. HEAT TREATMENT PROCESS LOG
-- ============================================================
CREATE TABLE heat_treatment_processes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  inspection_id   INT NOT NULL,
  process_type_id INT,
  equipment       VARCHAR(100),
  cycle_no        INT,
  temp_from       DECIMAL(8,2),   -- °C
  temp_to         DECIMAL(8,2),
  hold_time_min   INT,            -- minutes
  start_time      DATETIME,
  end_time        DATETIME,
  atmosphere      VARCHAR(100),   -- Vacuum level, gas composition
  uom             VARCHAR(20),
  result          VARCHAR(100),
  signed_by       VARCHAR(100),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id)   REFERENCES incoming_inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (process_type_id) REFERENCES process_types(id) ON DELETE SET NULL
);

-- ============================================================
-- 6. JOBWORK CHALLAN - Image 1
-- ============================================================
CREATE TABLE jobwork_challans (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  challan_no        VARCHAR(50) NOT NULL UNIQUE,
  challan_date      DATE NOT NULL,
  job_card_id       INT,

  -- From Party (Sheetal Dies)
  from_party_id     INT NOT NULL,
  -- To Party (Processor - Sheetal Vacuum Heat)
  to_party_id       INT NOT NULL,

  invoice_ch_no     VARCHAR(50),
  invoice_ch_date   DATE,
  transport_mode    VARCHAR(100) DEFAULT 'Hand Delivery',
  vehicle_no        VARCHAR(30),
  dispatch_date     DATE,
  due_date          DATE,           -- 180 days from dispatch
  processing_notes  TEXT,
  delivery_person   VARCHAR(100),

  -- Part 2 (Processor fills back)
  received_date     DATE,
  nature_of_process VARCHAR(200),
  qty_returned      INT,
  scrap_qty_kg      DECIMAL(8,3),
  scrap_details     TEXT,
  processor_sign    VARCHAR(100),

  rework_qty        INT,

  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  handling_charges  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_value       DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_rate         DECIMAL(5,2),
  cgst_amount       DECIMAL(12,2),
  sgst_rate         DECIMAL(5,2),
  sgst_amount       DECIMAL(12,2),
  igst_rate         DECIMAL(5,2),
  igst_amount       DECIMAL(12,2),
  grand_total       DECIMAL(12,2),
  status            ENUM('DRAFT','SENT','RECEIVED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',

  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id)   REFERENCES job_cards(id) ON DELETE SET NULL,
  FOREIGN KEY (from_party_id) REFERENCES parties(id),
  FOREIGN KEY (to_party_id)   REFERENCES parties(id),
  FOREIGN KEY (created_by)    REFERENCES users(id)
);

-- Challan Line Items
CREATE TABLE challan_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  challan_id      INT NOT NULL,
  item_id         INT,
  description     VARCHAR(300),
  drawing_no      VARCHAR(50),
  material        VARCHAR(100),
  hrc             VARCHAR(30),
  wo_no           VARCHAR(50),
  hsn_code        VARCHAR(20),
  quantity        DECIMAL(12,3) NOT NULL,
  qty_out         DECIMAL(12,3),
  uom             VARCHAR(10) DEFAULT 'KGS',
  weight          DECIMAL(12,3),
  rate            DECIMAL(12,2) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (challan_id) REFERENCES jobwork_challans(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)    REFERENCES items(id)
);

-- ============================================================
-- 7. DISPATCH / DELIVERY CHALLAN - Image 2
-- ============================================================
CREATE TABLE dispatch_challans (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  challan_no      VARCHAR(50) NOT NULL UNIQUE,
  challan_date    DATE NOT NULL,
  jobwork_challan_id INT,            -- Reference to original outward challan

  from_party_id   INT NOT NULL,
  to_party_id     INT NOT NULL,

  dispatch_mode   VARCHAR(100),
  vehicle_no      VARCHAR(30),
  remarks         TEXT,
  status          ENUM('DRAFT','SENT','RECEIVED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',

  created_by      INT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jobwork_challan_id) REFERENCES jobwork_challans(id) ON DELETE SET NULL,
  FOREIGN KEY (from_party_id)      REFERENCES parties(id),
  FOREIGN KEY (to_party_id)        REFERENCES parties(id),
  FOREIGN KEY (created_by)         REFERENCES users(id)
);

CREATE TABLE dispatch_challan_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  dispatch_id     INT NOT NULL,
  item_id         INT NOT NULL,
  description     VARCHAR(300),
  quantity        INT NOT NULL,
  weight_kg       DECIMAL(10,3),
  remarks         VARCHAR(300),
  FOREIGN KEY (dispatch_id) REFERENCES dispatch_challans(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)     REFERENCES items(id)
);

-- ============================================================
-- 8. TEST CERTIFICATES - Images 4.1 to 4.4
-- ============================================================
CREATE TABLE test_certificates (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  cert_no           VARCHAR(50) NOT NULL UNIQUE,
  cert_sequence     INT,                     -- 1, 2, 3... for multiple certs per job
  die_material      VARCHAR(100),
  operator_mode     VARCHAR(100),

  -- Categorization (mirrors IncomingInspection)
  cat_normal             BOOLEAN NOT NULL DEFAULT FALSE,
  cat_crack_risk         BOOLEAN NOT NULL DEFAULT FALSE,
  cat_distortion_risk    BOOLEAN NOT NULL DEFAULT FALSE,
  cat_critical_finishing BOOLEAN NOT NULL DEFAULT FALSE,
  cat_dent_damage        BOOLEAN NOT NULL DEFAULT FALSE,
  cat_cavity             BOOLEAN NOT NULL DEFAULT FALSE,
  cat_others             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Process checkboxes
  proc_stress_relieving  BOOLEAN NOT NULL DEFAULT FALSE,
  proc_hardening         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_tempering         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_annealing         BOOLEAN NOT NULL DEFAULT FALSE,
  proc_brazing           BOOLEAN NOT NULL DEFAULT FALSE,
  proc_plasma_nitriding  BOOLEAN NOT NULL DEFAULT FALSE,
  proc_sub_zero          BOOLEAN NOT NULL DEFAULT FALSE,
  proc_soak_clean        BOOLEAN NOT NULL DEFAULT FALSE,

  job_card_id       INT,
  your_po_no        VARCHAR(100),
  your_po_date      DATE,
  your_ref_no       VARCHAR(100),
  issue_no          VARCHAR(50),
  issue_date        DATE NOT NULL,
  checked_by        VARCHAR(100),
  
  -- Special Instructions
  spec_instr_certificate  BOOLEAN NOT NULL DEFAULT TRUE,
  spec_instr_mpi_report   BOOLEAN NOT NULL DEFAULT FALSE,
  spec_instr_process_graph BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Additional Details
  delivery_date          DATE,
  special_requirements   TEXT,
  precautions            TEXT,

  customer_id       INT NOT NULL,
  issued_by_party_id INT,          -- Sheetal Vacuum Heat

  -- Hardness achieved
  hardness_min      DECIMAL(6,2),
  hardness_max      DECIMAL(6,2),
  hardness_unit     VARCHAR(10) NOT NULL DEFAULT 'HRC',

  -- Heat treatment graph data (JSON: [{time, temp}, ...])
  temp_cycle_data   JSON,
  -- Heat treatment process log (JSON: [{equipment, process, ...}, ...])
  heat_process_data JSON,

  -- Distortion
  distortion_before JSON,
  distortion_after  JSON,

  -- 5 Part Images
  image1            VARCHAR(255),
  image2            VARCHAR(255),
  image3            VARCHAR(255),
  image4            VARCHAR(255),
  image5            VARCHAR(255),

  issued_to         VARCHAR(100),
  heat_no           VARCHAR(50),
  dispatch_mode     VARCHAR(100),
  dispatch_challan_no   VARCHAR(100),
  dispatch_challan_date DATE,
  dispatched_through    VARCHAR(100),
  packed_qty        INT,
  packed_by         VARCHAR(100),
  approved_by       VARCHAR(100),

  status            ENUM('DRAFT','ISSUED','APPROVED') NOT NULL DEFAULT 'DRAFT',
  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id)        REFERENCES job_cards(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id)        REFERENCES parties(id),
  FOREIGN KEY (issued_by_party_id) REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)         REFERENCES users(id)
);

-- Certificate Items
CREATE TABLE cert_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cert_id         INT NOT NULL,
  description     VARCHAR(300) NOT NULL,
  quantity        INT NOT NULL,
  weight_per_pc   DECIMAL(10,3),
  total_weight    DECIMAL(10,3),
  sampling_plan   VARCHAR(100),
  remarks         VARCHAR(300),
  FOREIGN KEY (cert_id) REFERENCES test_certificates(id) ON DELETE CASCADE
);

-- Certificate Inspection Results
CREATE TABLE cert_inspection_results (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  cert_id           INT NOT NULL,
  inspection_type   VARCHAR(100) NOT NULL,   -- Visual, MPI, Hardness
  parameter         VARCHAR(200),
  required_value    VARCHAR(100),
  achieved_value    VARCHAR(100),
  result            VARCHAR(10) NOT NULL DEFAULT 'OK',
  final_inspection  VARCHAR(100),
  FOREIGN KEY (cert_id) REFERENCES test_certificates(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. TAX INVOICE - Image 5
-- ============================================================
CREATE TABLE tax_invoices (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no        VARCHAR(50) NOT NULL UNIQUE,
  invoice_date      DATE NOT NULL,
  dispatch_date     DATE,

  from_party_id     INT NOT NULL,
  to_party_id       INT NOT NULL,

  challan_ref       VARCHAR(100),
  po_ref            VARCHAR(100),
  job_card_ref      VARCHAR(100),
  other_references  VARCHAR(300),

  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_rate         DECIMAL(5,2)  NOT NULL DEFAULT 9.00,
  cgst_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_rate         DECIMAL(5,2)  NOT NULL DEFAULT 9.00,
  sgst_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  igst_rate         DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  igst_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  transport_freight DECIMAL(12,2) NOT NULL DEFAULT 0,
  tcs_rate          DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  tcs_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  extra_amt         DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_in_words   VARCHAR(300),
  tax_amount_in_words VARCHAR(300),

  dispatch_doc_no   VARCHAR(100),
  e_way_bill_no     VARCHAR(50),
  payment_status    ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
  paid_date         DATE,
  payment_ref       VARCHAR(100),

  -- Tally integration lock
  challan_id        INT,                              -- FK to jobwork_challans (for partial invoicing)
  sent_to_tally     BOOLEAN NOT NULL DEFAULT FALSE,   -- once TRUE, invoice is locked
  sent_to_tally_at  DATETIME,

  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_party_id) REFERENCES parties(id),
  FOREIGN KEY (to_party_id)   REFERENCES parties(id),
  FOREIGN KEY (challan_id)    REFERENCES jobwork_challans(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)    REFERENCES users(id)
);

-- Invoice Line Items
CREATE TABLE invoice_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id      INT NOT NULL,
  description     VARCHAR(300) NOT NULL,
  material        VARCHAR(100),
  hrc             VARCHAR(30),
  wo_no           VARCHAR(50),
  hsn_sac         VARCHAR(20),
  quantity        DECIMAL(12,3) NOT NULL,
  unit            VARCHAR(10) NOT NULL DEFAULT 'KGS',
  weight          DECIMAL(12,3),
  rate            DECIMAL(12,2) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  process_type_id INT,             -- Links to process_types for auto-pricing
  FOREIGN KEY (invoice_id)      REFERENCES tax_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (process_type_id) REFERENCES process_types(id) ON DELETE SET NULL
);

-- ============================================================
-- 10. AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT,
  action        VARCHAR(100) NOT NULL,
  table_name    VARCHAR(100),
  record_id     INT,
  old_values    JSON,
  new_values    JSON,
  ip_address    VARCHAR(50),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 11. PURCHASE ORDERS & GRN (NEW MODULES)
-- ============================================================

-- Purchase Orders
CREATE TABLE purchase_orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  po_number         VARCHAR(50) NOT NULL UNIQUE,
  vendor_id         INT NOT NULL,
  po_date           DATE NOT NULL,
  expected_delivery DATE,
  status            ENUM('DRAFT','SENT','RECEIVED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  remarks           TEXT,
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id)  REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase Order Line Items
CREATE TABLE purchase_order_items (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id   INT NOT NULL,
  item_id             INT NOT NULL,
  quantity            INT NOT NULL,
  unit_price          DECIMAL(12,2) NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)           REFERENCES items(id)
);

-- Goods Receipt Notes (GRN)
CREATE TABLE grns (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  grn_number        VARCHAR(50) NOT NULL UNIQUE,
  purchase_order_id INT NOT NULL,
  grn_date          DATE NOT NULL,
  status            ENUM('RECEIVED','ACCEPTED','PARTIAL_REJECTED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'RECEIVED',
  remarks           TEXT,
  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (created_by)        REFERENCES users(id)
);

-- GRN Line Items (tracking received, accepted, rejected quantities)
CREATE TABLE grn_items (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  grn_id                INT NOT NULL,
  item_id               INT NOT NULL,
  quantity_received     INT NOT NULL,
  quantity_accepted     INT NOT NULL,
  quantity_rejected     INT NOT NULL,
  remarks               VARCHAR(300),
  FOREIGN KEY (grn_id)  REFERENCES grns(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Inventory / Stock Tracking
CREATE TABLE inventories (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  item_id           INT NOT NULL UNIQUE,
  quantity_on_hand  INT NOT NULL DEFAULT 0,
  reorder_level     INT NOT NULL DEFAULT 50,
  last_restock_date DATE,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================================
-- 12. MANUFACTURING BATCH & VHT RUNSHEET
-- ============================================================

-- Manufacturing Batches
CREATE TABLE manufacturing_batches (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  batch_date   DATE NOT NULL,
  status       ENUM('CREATED','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED') NOT NULL DEFAULT 'CREATED',
  remarks      TEXT,
  created_by   INT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- M:N Bridge Table: Manufacturing Batch to Job Cards
CREATE TABLE manufacturing_batch_jobcards (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  batch_id   INT NOT NULL,
  job_card_id INT NOT NULL,
  UNIQUE KEY unique_batch_jobcard (batch_id, job_card_id),
  FOREIGN KEY (batch_id)    REFERENCES manufacturing_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id)
);

-- VHT Runsheets (Heat Treatment Planning)
CREATE TABLE vht_runsheets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  runsheet_number VARCHAR(50) NOT NULL UNIQUE,
  batch_id      INT NOT NULL,
  furnace_id    INT NOT NULL,
  temp_profile  VARCHAR(200),
  cycle_time    INT NOT NULL DEFAULT 240,  -- in minutes
  status        ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  actual_output INT,
  remarks       TEXT,
  created_by    INT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)   REFERENCES manufacturing_batches(id),
  FOREIGN KEY (furnace_id) REFERENCES machines(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- VHT Runsheet Line Items (Items in furnace slots)
CREATE TABLE vht_runsheet_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  runsheet_id     INT NOT NULL,
  item_id         INT NOT NULL,
  quantity        INT NOT NULL,
  planned_slot    VARCHAR(20) NOT NULL,  -- SLOT-1, SLOT-2, SLOT-3, SLOT-4
  FOREIGN KEY (runsheet_id) REFERENCES vht_runsheets(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)     REFERENCES items(id)
);

-- Production Plans (Daily shift planning)
CREATE TABLE production_plans (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  batch_id   INT NOT NULL,
  plan_date  DATE NOT NULL,
  status     ENUM('DRAFT','APPROVED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'DRAFT',
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)   REFERENCES manufacturing_batches(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Shifts (Machine/Labor allocation per shift)
CREATE TABLE shifts (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  plan_id              INT NOT NULL,
  shift_number         INT NOT NULL,           -- 1, 2, 3 (morning, evening, night)
  start_time           DATETIME NOT NULL,
  end_time             DATETIME NOT NULL,
  machinery_assigned   VARCHAR(100),
  operator_assigned    VARCHAR(100),
  planned_output       INT NOT NULL,
  actual_output        INT,
  reason               VARCHAR(300),           -- for downtime tracking
  FOREIGN KEY (plan_id) REFERENCES production_plans(id) ON DELETE CASCADE
);

-- ============================================================
-- 13. QUOTE & ATTACHMENTS (Prisma parity)
-- ============================================================

CREATE TABLE supplier_quotes (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  quote_number       VARCHAR(50) NOT NULL UNIQUE,
  vendor_id          INT NOT NULL,
  quote_date         DATE NOT NULL,
  valid_until        DATE,
  status             ENUM('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED_TO_PO') NOT NULL DEFAULT 'DRAFT',
  description        TEXT,
  subtotal           DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate           DECIMAL(5,2),
  tax_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes              TEXT,
  payment_terms      VARCHAR(300),
  delivery_days      INT,
  created_by         INT NOT NULL,
  purchase_order_id  INT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

CREATE TABLE quote_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  quote_id      INT NOT NULL,
  description   VARCHAR(300) NOT NULL,
  specification TEXT,
  quantity      DECIMAL(12,3) NOT NULL,
  unit          VARCHAR(20) NOT NULL DEFAULT 'NOS',
  unit_price    DECIMAL(12,2) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  remarks       VARCHAR(300),
  FOREIGN KEY (quote_id) REFERENCES supplier_quotes(id) ON DELETE CASCADE
);

CREATE TABLE attachments (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  file_name          VARCHAR(255) NOT NULL,
  file_size          INT NOT NULL,
  file_path          VARCHAR(500) NOT NULL,
  mime_type          VARCHAR(100) NOT NULL,
  attachment_type    ENUM('PHOTO','DOCUMENT','CERTIFICATE','DRAWING','INSPECTION_REPORT','PURCHASE_QUOTE','CONTRACT','OTHER') NOT NULL DEFAULT 'OTHER',
  description        TEXT,
  job_card_id        INT,
  test_cert_id       INT,
  quote_id           INT,
  purchase_order_id  INT,
  jobwork_challan_id INT,
  entity_type        VARCHAR(100),
  entity_id          INT,
  uploaded_by        INT NOT NULL,
  uploaded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_public          BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL,
  FOREIGN KEY (test_cert_id) REFERENCES test_certificates(id) ON DELETE SET NULL,
  FOREIGN KEY (quote_id) REFERENCES supplier_quotes(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (jobwork_challan_id) REFERENCES jobwork_challans(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================
DROP PROCEDURE IF EXISTS ensure_index;
DROP PROCEDURE IF EXISTS ensure_fk;
DELIMITER $$
CREATE PROCEDURE ensure_index(IN p_table VARCHAR(128), IN p_index VARCHAR(128), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @sql = p_ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE ensure_fk(IN p_table VARCHAR(128), IN p_fk VARCHAR(128), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_fk
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    SET @sql = p_ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL ensure_index('job_cards', 'idx_job_cards_status', 'CREATE INDEX idx_job_cards_status ON job_cards(status)');
CALL ensure_index('job_cards', 'idx_job_cards_part', 'CREATE INDEX idx_job_cards_part ON job_cards(part_id)');
CALL ensure_index('jobwork_challans', 'idx_challans_status', 'CREATE INDEX idx_challans_status ON jobwork_challans(status)');
CALL ensure_index('jobwork_challans', 'idx_challans_date', 'CREATE INDEX idx_challans_date ON jobwork_challans(challan_date)');
CALL ensure_index('tax_invoices', 'idx_invoices_date', 'CREATE INDEX idx_invoices_date ON tax_invoices(invoice_date)');
CALL ensure_index('tax_invoices', 'idx_invoices_payment', 'CREATE INDEX idx_invoices_payment ON tax_invoices(payment_status)');
CALL ensure_index('test_certificates', 'idx_certs_date', 'CREATE INDEX idx_certs_date ON test_certificates(issue_date)');
CALL ensure_index('audit_logs', 'idx_audit_user', 'CREATE INDEX idx_audit_user ON audit_logs(user_id)');
CALL ensure_index('audit_logs', 'idx_audit_table', 'CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id)');
-- Indexes for Purchase & Manufacturing
CALL ensure_index('purchase_orders', 'idx_purchase_orders_status', 'CREATE INDEX idx_purchase_orders_status ON purchase_orders(status)');
CALL ensure_index('purchase_orders', 'idx_purchase_orders_vendor', 'CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id)');
CALL ensure_index('grns', 'idx_grns_status', 'CREATE INDEX idx_grns_status ON grns(status)');
CALL ensure_index('grns', 'idx_grns_po', 'CREATE INDEX idx_grns_po ON grns(purchase_order_id)');
CALL ensure_index('inventories', 'idx_inventory_item', 'CREATE INDEX idx_inventory_item ON inventories(item_id)');
CALL ensure_index('manufacturing_batches', 'idx_manufacturing_batches_status', 'CREATE INDEX idx_manufacturing_batches_status ON manufacturing_batches(status)');
CALL ensure_index('vht_runsheets', 'idx_vht_runsheets_status', 'CREATE INDEX idx_vht_runsheets_status ON vht_runsheets(status)');
CALL ensure_index('vht_runsheets', 'idx_vht_runsheets_batch', 'CREATE INDEX idx_vht_runsheets_batch ON vht_runsheets(batch_id)');
CALL ensure_index('production_plans', 'idx_production_plans_date', 'CREATE INDEX idx_production_plans_date ON production_plans(plan_date)');
CALL ensure_index('shifts', 'idx_shifts_plan', 'CREATE INDEX idx_shifts_plan ON shifts(plan_id)');
CALL ensure_index('supplier_quotes', 'idx_supplier_quotes_vendor', 'CREATE INDEX idx_supplier_quotes_vendor ON supplier_quotes(vendor_id)');
CALL ensure_index('supplier_quotes', 'idx_supplier_quotes_status', 'CREATE INDEX idx_supplier_quotes_status ON supplier_quotes(status)');
CALL ensure_index('supplier_quotes', 'idx_supplier_quotes_date', 'CREATE INDEX idx_supplier_quotes_date ON supplier_quotes(quote_date)');
CALL ensure_index('quote_items', 'idx_quote_items_quote', 'CREATE INDEX idx_quote_items_quote ON quote_items(quote_id)');
CALL ensure_index('attachments', 'idx_attachments_job_card', 'CREATE INDEX idx_attachments_job_card ON attachments(job_card_id)');
CALL ensure_index('attachments', 'idx_attachments_test_cert', 'CREATE INDEX idx_attachments_test_cert ON attachments(test_cert_id)');
CALL ensure_index('attachments', 'idx_attachments_quote', 'CREATE INDEX idx_attachments_quote ON attachments(quote_id)');
CALL ensure_index('attachments', 'idx_attachments_po', 'CREATE INDEX idx_attachments_po ON attachments(purchase_order_id)');
CALL ensure_index('attachments', 'idx_attachments_entity', 'CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id)');

-- Performance Optimization Indexes (Prisma Parity)
CALL ensure_index('job_cards', 'idx_job_cards_customer', 'CREATE INDEX idx_job_cards_customer ON job_cards(customer_id)');
CALL ensure_index('job_cards', 'idx_job_cards_machine', 'CREATE INDEX idx_job_cards_machine ON job_cards(machine_id)');

CALL ensure_index('incoming_inspections', 'idx_inspections_job_card', 'CREATE INDEX idx_inspections_job_card ON incoming_inspections(job_card_id)');
CALL ensure_index('incoming_inspections', 'idx_inspections_process', 'CREATE INDEX idx_inspections_process ON incoming_inspections(process_type_id)');
CALL ensure_index('incoming_inspections', 'idx_inspections_status', 'CREATE INDEX idx_inspections_status ON incoming_inspections(inspection_status)');

CALL ensure_index('jobwork_challans', 'idx_challans_job_card', 'CREATE INDEX idx_challans_job_card ON jobwork_challans(job_card_id)');
CALL ensure_index('jobwork_challans', 'idx_challans_from_party', 'CREATE INDEX idx_challans_from_party ON jobwork_challans(from_party_id)');
CALL ensure_index('jobwork_challans', 'idx_challans_to_party', 'CREATE INDEX idx_challans_to_party ON jobwork_challans(to_party_id)');

CALL ensure_index('challan_items', 'idx_challan_items_challan', 'CREATE INDEX idx_challan_items_challan ON challan_items(challan_id)');
CALL ensure_index('challan_items', 'idx_challan_items_item', 'CREATE INDEX idx_challan_items_item ON challan_items(item_id)');

CALL ensure_index('test_certificates', 'idx_certs_job_card', 'CREATE INDEX idx_certs_job_card ON test_certificates(job_card_id)');
CALL ensure_index('test_certificates', 'idx_certs_customer', 'CREATE INDEX idx_certs_customer ON test_certificates(customer_id)');
CALL ensure_index('test_certificates', 'idx_certs_status', 'CREATE INDEX idx_certs_status ON test_certificates(status)');

CALL ensure_index('tax_invoices', 'idx_invoices_challan', 'CREATE INDEX idx_invoices_challan ON tax_invoices(challan_id)');
CALL ensure_index('tax_invoices', 'idx_invoices_to_party', 'CREATE INDEX idx_invoices_to_party ON tax_invoices(to_party_id)');

CALL ensure_index('invoice_items', 'idx_invoice_items_invoice', 'CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id)');
CALL ensure_index('invoice_items', 'idx_invoice_items_process', 'CREATE INDEX idx_invoice_items_process ON invoice_items(process_type_id)');


-- ============================================================
-- ADMIN USER CREATION
-- ============================================================
-- Intentionally omitted from SQL bootstrap to avoid shipping default credentials.
-- Create users through the application or controlled admin scripts with explicit credentials.

-- Default Company Party
INSERT IGNORE INTO parties (name, address, city, state, pin_code, gstin, pan, state_code, party_type) VALUES
('Sheetal Dies & Tools Pvt. Ltd.', 'D9 Sai Industrial Premises, Plot No. 40, PCNTDA, Bhosari', 'Pune', 'Maharashtra', '411026', '27AABCS1234F1Z5', 'AABCS1234F', '27', 'BOTH'),
('Sheetal Vacuum Heat Pvt. Ltd.',  'Gat No. 120, Jyotiba Nagar, Talawade', 'Pune', 'Maharashtra', '411062', '27MMMPP5678K1Z9', 'MMMPP5678K', '27', 'VENDOR');

-- Default Machines
INSERT IGNORE INTO machines (code, name, type, make) VALUES
('VMC-01', 'Vertical Machining Centre 1', 'VMC', 'BFW'),
('VMC-02', 'Vertical Machining Centre 2', 'VMC', 'Haas'),
('CNC-04', 'CNC Turning Centre 4',        'CNC', 'Mazak'),
('RD-01',  'Radial Drilling Machine',      'Radial Drill', 'HMT'),
('CONV-01','Conventional Lathe',           'Conventional', 'HMT');

-- ============================================================
-- 13. SCHEMA SYNC PATCHES (Prisma parity additions)
-- ============================================================

-- Incoming inspection: additional fields used by app
ALTER TABLE incoming_inspections
  ADD COLUMN IF NOT EXISTS cat_welded BOOLEAN NOT NULL DEFAULT FALSE AFTER cat_normal,
  ADD COLUMN IF NOT EXISTS cat_rusty BOOLEAN NOT NULL DEFAULT FALSE AFTER cat_dent_damage,
  ADD COLUMN IF NOT EXISTS visual_before BOOLEAN NOT NULL DEFAULT FALSE AFTER proc_slow_cool,
  ADD COLUMN IF NOT EXISTS visual_after BOOLEAN NOT NULL DEFAULT FALSE AFTER visual_before,
  ADD COLUMN IF NOT EXISTS mpi_before BOOLEAN NOT NULL DEFAULT FALSE AFTER visual_after,
  ADD COLUMN IF NOT EXISTS mpi_after BOOLEAN NOT NULL DEFAULT FALSE AFTER mpi_before,
  ADD COLUMN IF NOT EXISTS mpi_nil BOOLEAN NOT NULL DEFAULT FALSE AFTER mpi_after,
  ADD COLUMN IF NOT EXISTS hardness_after_1 DECIMAL(6,2) AFTER achieved_hardness,
  ADD COLUMN IF NOT EXISTS hardness_after_2 DECIMAL(6,2) AFTER hardness_after_1,
  ADD COLUMN IF NOT EXISTS hardness_after_3 DECIMAL(6,2) AFTER hardness_after_2,
  ADD COLUMN IF NOT EXISTS hardness_after_4 DECIMAL(6,2) AFTER hardness_after_3,
  ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE AFTER image5;

-- Heat treatment process log: additional fields
ALTER TABLE heat_treatment_processes
  ADD COLUMN IF NOT EXISTS temp_time VARCHAR(100) AFTER cycle_no,
  ADD COLUMN IF NOT EXISTS process_date DATE AFTER end_time,
  ADD COLUMN IF NOT EXISTS loading_by VARCHAR(100) AFTER process_date;

-- Dispatch challan item: link to source challan line
ALTER TABLE dispatch_challan_items
  ADD COLUMN IF NOT EXISTS source_challan_item_id INT AFTER item_id;

CALL ensure_index(
  'dispatch_challan_items',
  'idx_dispatch_items_source_challan_item',
  'CREATE INDEX idx_dispatch_items_source_challan_item ON dispatch_challan_items(source_challan_item_id)'
);

CALL ensure_fk(
  'dispatch_challan_items',
  'fk_dispatch_items_source_challan_item',
  'ALTER TABLE dispatch_challan_items ADD CONSTRAINT fk_dispatch_items_source_challan_item FOREIGN KEY (source_challan_item_id) REFERENCES challan_items(id) ON DELETE SET NULL'
);

-- Invoice item: optional links used for traceability
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS cert_id INT AFTER invoice_id,
  ADD COLUMN IF NOT EXISTS source_challan_item_id INT AFTER cert_id;

CALL ensure_index(
  'invoice_items',
  'idx_invoice_items_cert',
  'CREATE INDEX idx_invoice_items_cert ON invoice_items(cert_id)'
);
CALL ensure_index(
  'invoice_items',
  'idx_invoice_items_source_challan_item',
  'CREATE INDEX idx_invoice_items_source_challan_item ON invoice_items(source_challan_item_id)'
);

CALL ensure_fk(
  'invoice_items',
  'fk_invoice_items_cert',
  'ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_cert FOREIGN KEY (cert_id) REFERENCES test_certificates(id) ON DELETE SET NULL'
);
CALL ensure_fk(
  'invoice_items',
  'fk_invoice_items_source_challan_item',
  'ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_source_challan_item FOREIGN KEY (source_challan_item_id) REFERENCES challan_items(id) ON DELETE SET NULL'
);

-- Inventory movement history ledger
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  item_id             INT NOT NULL,
  source              ENUM('GRN','MANUAL_ADJUSTMENT') NOT NULL,
  quantity_change     INT NOT NULL,
  balance_after       INT NOT NULL,
  reorder_level_after INT NOT NULL,
  reference_type      VARCHAR(50),
  reference_id        INT,
  remarks             VARCHAR(300),
  created_by          INT NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CALL ensure_index(
  'inventory_movements',
  'idx_inventory_movements_item_created',
  'CREATE INDEX idx_inventory_movements_item_created ON inventory_movements(item_id, created_at)'
);
CALL ensure_index(
  'inventory_movements',
  'idx_inventory_movements_source_created',
  'CREATE INDEX idx_inventory_movements_source_created ON inventory_movements(source, created_at)'
);

-- Workflow engine tables
CREATE TABLE IF NOT EXISTS workflow_templates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  industry      VARCHAR(100),
  version       INT NOT NULL DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    INT,
  updated_by    INT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  template_id       INT NOT NULL,
  step_code         VARCHAR(60) NOT NULL,
  step_name         VARCHAR(150) NOT NULL,
  step_type         ENUM('OPERATION','INSPECTION','DECISION','DISPATCH','LOOP') NOT NULL DEFAULT 'OPERATION',
  sequence_no       INT NOT NULL,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  is_repeatable     BOOLEAN NOT NULL DEFAULT FALSE,
  requires_machine  BOOLEAN NOT NULL DEFAULT FALSE,
  requires_qc       BOOLEAN NOT NULL DEFAULT FALSE,
  requires_file     BOOLEAN NOT NULL DEFAULT FALSE,
  allow_parallel    BOOLEAN NOT NULL DEFAULT FALSE,
  sla_minutes       INT,
  config_json       JSON,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workflow_step_code (template_id, step_code),
  UNIQUE KEY uq_workflow_step_seq  (template_id, sequence_no),
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  template_id     INT NOT NULL,
  from_step_id    INT NOT NULL,
  to_step_id      INT NOT NULL,
  condition_type  ENUM('ALWAYS','MATERIAL_TYPE_IN','QC_PASS','QC_FAIL','FIELD_EQUALS') NOT NULL DEFAULT 'ALWAYS',
  condition_expr  JSON,
  priority        INT NOT NULL DEFAULT 1,
  is_rework_path  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (from_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (to_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_workflows (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  job_card_id     INT NOT NULL UNIQUE,
  template_id     INT NOT NULL,
  status          ENUM('NOT_STARTED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
  current_step_id INT,
  started_at      DATETIME,
  completed_at    DATETIME,
  started_by      INT,
  remarks         TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id),
  FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_step_tracking (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  job_workflow_id  INT NOT NULL,
  workflow_step_id INT NOT NULL,
  run_no           INT NOT NULL DEFAULT 1,
  status           ENUM('PENDING','IN_PROGRESS','COMPLETED','SKIPPED','FAILED') NOT NULL DEFAULT 'PENDING',
  started_at       DATETIME,
  ended_at         DATETIME,
  duration_sec     INT,
  operator_name    VARCHAR(100),
  machine_id       INT,
  qc_result        ENUM('PENDING','PASS','FAIL','CONDITIONAL'),
  observations     TEXT,
  remarks          TEXT,
  attachments      JSON,
  input_data       JSON,
  output_data      JSON,
  executed_by      INT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_step_run (job_workflow_id, workflow_step_id, run_no),
  FOREIGN KEY (job_workflow_id) REFERENCES job_workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
  FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Plant/furnace operational reporting tables
CREATE TABLE IF NOT EXISTS plant_loss_months (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  year        INT NOT NULL,
  month       INT NOT NULL,
  notes       TEXT,
  created_by  INT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plant_loss_month (year, month),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plant_loss_entries (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  month_id               INT NOT NULL,
  machine_id             INT,
  furnace_name           VARCHAR(120),
  available_hours        DECIMAL(10,2) NOT NULL DEFAULT 624.00,
  used_hours             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  loading_unloading_min  DECIMAL(10,2),
  waiting_cycle_prep_hrs DECIMAL(10,2),
  waiting_material_hrs   DECIMAL(10,2),
  cleaning_furnace_hrs   DECIMAL(10,2),
  breakdown_maint_hrs    DECIMAL(10,2),
  no_power_hrs           DECIMAL(10,2),
  no_material_hrs        DECIMAL(10,2),
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plant_loss_entry_month_machine (month_id, machine_id),
  FOREIGN KEY (month_id) REFERENCES plant_loss_months(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_idle_logs (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  machine_id             INT NOT NULL,
  log_date               DATE NOT NULL,
  loading_unloading_min  INT NOT NULL DEFAULT 0,
  waiting_cycle_prep_min INT NOT NULL DEFAULT 0,
  waiting_material_min   INT NOT NULL DEFAULT 0,
  preventive_maint_min   INT NOT NULL DEFAULT 0,
  breakdown_maint_min    INT NOT NULL DEFAULT 0,
  no_power_min           INT NOT NULL DEFAULT 0,
  no_material_min        INT NOT NULL DEFAULT 0,
  remarks                VARCHAR(300),
  created_by             INT NOT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_daily_idle_machine_date (machine_id, log_date),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS furnace_utilization_days (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  machine_id     INT NOT NULL,
  util_date      DATE NOT NULL,
  shift1_used_min INT NOT NULL DEFAULT 0,
  shift2_used_min INT NOT NULL DEFAULT 0,
  shift3_used_min INT NOT NULL DEFAULT 0,
  s1_a INT NOT NULL DEFAULT 0, s1_b INT NOT NULL DEFAULT 0, s1_c INT NOT NULL DEFAULT 0,
  s1_d INT NOT NULL DEFAULT 0, s1_e INT NOT NULL DEFAULT 0, s1_f INT NOT NULL DEFAULT 0, s1_g INT NOT NULL DEFAULT 0,
  s2_a INT NOT NULL DEFAULT 0, s2_b INT NOT NULL DEFAULT 0, s2_c INT NOT NULL DEFAULT 0,
  s2_d INT NOT NULL DEFAULT 0, s2_e INT NOT NULL DEFAULT 0, s2_f INT NOT NULL DEFAULT 0, s2_g INT NOT NULL DEFAULT 0,
  s3_a INT NOT NULL DEFAULT 0, s3_b INT NOT NULL DEFAULT 0, s3_c INT NOT NULL DEFAULT 0,
  s3_d INT NOT NULL DEFAULT 0, s3_e INT NOT NULL DEFAULT 0, s3_f INT NOT NULL DEFAULT 0, s3_g INT NOT NULL DEFAULT 0,
  remarks        VARCHAR(300),
  signed_by      VARCHAR(100),
  created_by     INT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_furnace_util_machine_date (machine_id, util_date),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS furnace_plan_days (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  plan_date   DATE NOT NULL UNIQUE,
  notes       TEXT,
  created_by  INT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS furnace_plan_slots (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  plan_day_id    INT NOT NULL,
  machine_id     INT NOT NULL,
  job_card_id    INT,
  process_type_id INT,
  stage          ENUM('HARDENING','TEMPERING','OTHER') NOT NULL DEFAULT 'HARDENING',
  start_time     DATETIME NOT NULL,
  end_time       DATETIME NOT NULL,
  end_next_day   BOOLEAN NOT NULL DEFAULT FALSE,
  temp_c         INT,
  hold_min       INT,
  pressure_bar   DECIMAL(6,2),
  fan_rpm        INT,
  hold_at_c      INT,
  hold_extra_min INT,
  title          VARCHAR(200),
  remarks        TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_day_id) REFERENCES furnace_plan_days(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL,
  FOREIGN KEY (process_type_id) REFERENCES process_types(id) ON DELETE SET NULL
);

-- VHT Runsheet: new execution/doc columns used by current app
ALTER TABLE vht_runsheets
  ADD COLUMN IF NOT EXISTS run_date DATE AFTER furnace_id,
  ADD COLUMN IF NOT EXISTS cycle_end_time VARCHAR(10) AFTER run_date,
  ADD COLUMN IF NOT EXISTS total_time_display VARCHAR(20) AFTER cycle_end_time,
  ADD COLUMN IF NOT EXISTS mr_start INT AFTER total_time_display,
  ADD COLUMN IF NOT EXISTS mr_end INT AFTER mr_start,
  ADD COLUMN IF NOT EXISTS total_mr INT AFTER mr_end,
  ADD COLUMN IF NOT EXISTS loading_operator_name VARCHAR(100) AFTER total_mr,
  ADD COLUMN IF NOT EXISTS doc_rev_no VARCHAR(20) AFTER loading_operator_name,
  ADD COLUMN IF NOT EXISTS doc_effective_date DATE AFTER doc_rev_no,
  ADD COLUMN IF NOT EXISTS doc_page_of VARCHAR(20) AFTER doc_effective_date,
  ADD COLUMN IF NOT EXISTS hardening_type VARCHAR(200) AFTER cycle_time,
  ADD COLUMN IF NOT EXISTS quench_pressure_bar DECIMAL(6,2) AFTER hardening_type,
  ADD COLUMN IF NOT EXISTS fan_rpm INT AFTER quench_pressure_bar,
  ADD COLUMN IF NOT EXISTS fixtures_position VARCHAR(120) AFTER fan_rpm,
  ADD COLUMN IF NOT EXISTS temp_graph_points JSON AFTER fixtures_position,
  ADD COLUMN IF NOT EXISTS operator_sign VARCHAR(150) AFTER temp_graph_points,
  ADD COLUMN IF NOT EXISTS supervisor_sign VARCHAR(150) AFTER operator_sign,
  ADD COLUMN IF NOT EXISTS supervisor_verified_at DATETIME AFTER supervisor_sign,
  ADD COLUMN IF NOT EXISTS verification_note TEXT AFTER supervisor_verified_at;

CALL ensure_index(
  'vht_runsheets',
  'idx_vht_runsheets_run_date_furnace',
  'CREATE INDEX idx_vht_runsheets_run_date_furnace ON vht_runsheets(run_date, furnace_id)'
);

-- VHT Runsheet items: additional traceability fields
ALTER TABLE vht_runsheet_items
  ADD COLUMN IF NOT EXISTS job_card_id INT AFTER runsheet_id,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) AFTER item_id,
  ADD COLUMN IF NOT EXISTS job_description VARCHAR(300) AFTER customer_name,
  ADD COLUMN IF NOT EXISTS material_grade VARCHAR(100) AFTER job_description,
  ADD COLUMN IF NOT EXISTS hrc_required VARCHAR(50) AFTER material_grade,
  ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,3) AFTER quantity;

CALL ensure_index(
  'vht_runsheet_items',
  'idx_vht_runsheet_items_job_card',
  'CREATE INDEX idx_vht_runsheet_items_job_card ON vht_runsheet_items(job_card_id)'
);

CALL ensure_fk(
  'vht_runsheet_items',
  'fk_vht_runsheet_items_job_card',
  'ALTER TABLE vht_runsheet_items ADD CONSTRAINT fk_vht_runsheet_items_job_card FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL'
);

-- ============================================================
-- 14. COMPOUND INDEXES FOR DASHBOARD PERFORMANCE (D3 fix)
-- ============================================================
CALL ensure_index('job_cards', 'idx_job_cards_status_created', 'CREATE INDEX idx_job_cards_status_created ON job_cards(status, created_at)');
CALL ensure_index('job_cards', 'idx_job_cards_customer_status', 'CREATE INDEX idx_job_cards_customer_status ON job_cards(customer_id, status)');
CALL ensure_index('job_cards', 'idx_job_cards_machine_status', 'CREATE INDEX idx_job_cards_machine_status ON job_cards(machine_id, status)');
CALL ensure_index('job_cards', 'idx_job_cards_due_date', 'CREATE INDEX idx_job_cards_due_date ON job_cards(due_date)');
CALL ensure_index('jobwork_challans', 'idx_challans_from_party_status', 'CREATE INDEX idx_challans_from_party_status ON jobwork_challans(from_party_id, status)');
CALL ensure_index('jobwork_challans', 'idx_challans_to_party_status', 'CREATE INDEX idx_challans_to_party_status ON jobwork_challans(to_party_id, status)');
CALL ensure_index('tax_invoices', 'idx_invoices_to_party_date', 'CREATE INDEX idx_invoices_to_party_date ON tax_invoices(to_party_id, invoice_date)');
CALL ensure_index('tax_invoices', 'idx_invoices_payment_date', 'CREATE INDEX idx_invoices_payment_date ON tax_invoices(payment_status, invoice_date)');
CALL ensure_index('test_certificates', 'idx_certs_customer_date', 'CREATE INDEX idx_certs_customer_date ON test_certificates(customer_id, issue_date)');
CALL ensure_index('test_certificates', 'idx_certs_status', 'CREATE INDEX idx_certs_status ON test_certificates(status)');
CALL ensure_index('incoming_inspections', 'idx_inspections_status', 'CREATE INDEX idx_inspections_status ON incoming_inspections(inspection_status)');
CALL ensure_index('challan_items', 'idx_challan_items_challan', 'CREATE INDEX idx_challan_items_challan ON challan_items(challan_id)');
CALL ensure_index('challan_items', 'idx_challan_items_item', 'CREATE INDEX idx_challan_items_item ON challan_items(item_id)');
CALL ensure_index('dispatch_challan_items', 'idx_dispatch_items_dispatch', 'CREATE INDEX idx_dispatch_items_dispatch ON dispatch_challan_items(dispatch_id)');
CALL ensure_index('parties', 'idx_parties_type_active', 'CREATE INDEX idx_parties_type_active ON parties(party_type, is_active)');
CALL ensure_index('items', 'idx_items_active', 'CREATE INDEX idx_items_active ON items(is_active)');
CALL ensure_index('cert_items', 'idx_cert_items_cert', 'CREATE INDEX idx_cert_items_cert ON cert_items(cert_id)');
CALL ensure_index('invoice_items', 'idx_invoice_items_invoice', 'CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id)');

-- ============================================================
-- 15. DECIMAL PRECISION FIX (D4 fix)
-- ============================================================
-- dispatch_challan_items.quantity was INT but should match challan_items DECIMAL(12,3)
ALTER TABLE dispatch_challan_items
  MODIFY COLUMN quantity DECIMAL(12,3) NOT NULL;

-- ============================================================
-- 16. PRISMA ↔ SQL SCHEMA SYNC — Missing job_card columns (D1 fix)
-- ============================================================
-- These fields exist in Prisma schema.prisma but were missing from bootstrap SQL.
-- Using ADD COLUMN IF NOT EXISTS for idempotent execution.

ALTER TABLE job_cards
  ADD COLUMN IF NOT EXISTS issue_date DATE AFTER end_date,
  ADD COLUMN IF NOT EXISTS issue_by VARCHAR(100) AFTER issue_date,
  ADD COLUMN IF NOT EXISTS certificate_no VARCHAR(50) AFTER issue_by,
  ADD COLUMN IF NOT EXISTS customer_name_snapshot VARCHAR(200) AFTER certificate_no,
  ADD COLUMN IF NOT EXISTS customer_address_snapshot TEXT AFTER customer_name_snapshot,
  ADD COLUMN IF NOT EXISTS factory_name VARCHAR(200) AFTER customer_address_snapshot,
  ADD COLUMN IF NOT EXISTS factory_address TEXT AFTER factory_name,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(150) AFTER factory_address,
  ADD COLUMN IF NOT EXISTS dispatch_by_our_vehicle BOOLEAN NOT NULL DEFAULT FALSE AFTER contact_email,
  ADD COLUMN IF NOT EXISTS dispatch_by_courier BOOLEAN NOT NULL DEFAULT FALSE AFTER dispatch_by_our_vehicle,
  ADD COLUMN IF NOT EXISTS collected_by_customer BOOLEAN NOT NULL DEFAULT FALSE AFTER dispatch_by_courier,
  ADD COLUMN IF NOT EXISTS hrc_range VARCHAR(50) AFTER collected_by_customer,
  ADD COLUMN IF NOT EXISTS special_requirements TEXT AFTER hrc_range,
  ADD COLUMN IF NOT EXISTS precautions TEXT AFTER special_requirements,
  ADD COLUMN IF NOT EXISTS document_no VARCHAR(50) AFTER precautions,
  ADD COLUMN IF NOT EXISTS revision_no VARCHAR(20) AFTER document_no,
  ADD COLUMN IF NOT EXISTS revision_date DATE AFTER revision_no,
  ADD COLUMN IF NOT EXISTS page_no VARCHAR(20) AFTER revision_date,
  ADD COLUMN IF NOT EXISTS spec_instr_cert BOOLEAN NOT NULL DEFAULT FALSE AFTER page_no,
  ADD COLUMN IF NOT EXISTS spec_instr_mpi_rep BOOLEAN NOT NULL DEFAULT FALSE AFTER spec_instr_cert,
  ADD COLUMN IF NOT EXISTS spec_instr_graph BOOLEAN NOT NULL DEFAULT FALSE AFTER spec_instr_mpi_rep;

-- FurnacePlanStage enum expansion (D2 fix)
-- Add missing enum values from Prisma schema
ALTER TABLE furnace_plan_slots
  MODIFY COLUMN stage ENUM('HARDENING','TEMPERING','STRESS_RELIEVING','ANNEALING','BRAZING','PLASMA_NITRIDING','NITRIDING','SUB_ZERO','OTHER') NOT NULL DEFAULT 'HARDENING';

-- Soft-delete support for more entities (D6 fix)
ALTER TABLE job_cards
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER remarks;

ALTER TABLE jobwork_challans
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER status;

ALTER TABLE tax_invoices
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER payment_ref;

ALTER TABLE test_certificates
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER status;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER status;

-- Indexes for soft-deleted records filtering
CALL ensure_index('job_cards', 'idx_job_cards_deleted', 'CREATE INDEX idx_job_cards_deleted ON job_cards(is_deleted)');
CALL ensure_index('jobwork_challans', 'idx_challans_deleted', 'CREATE INDEX idx_challans_deleted ON jobwork_challans(is_deleted)');
CALL ensure_index('tax_invoices', 'idx_invoices_deleted', 'CREATE INDEX idx_invoices_deleted ON tax_invoices(is_deleted)');
CALL ensure_index('test_certificates', 'idx_certs_deleted', 'CREATE INDEX idx_certs_deleted ON test_certificates(is_deleted)');
CALL ensure_index('purchase_orders', 'idx_po_deleted', 'CREATE INDEX idx_po_deleted ON purchase_orders(is_deleted)');
