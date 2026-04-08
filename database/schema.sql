-- ============================================================
-- SHEETAL DIES & TOOLS PVT. LTD. - ERP DATABASE SCHEMA
-- Database: MySQL 8.0+
-- ORM: Prisma
-- ============================================================

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

-- Insert default process types (from process.jpeg - exact 8 types)
-- Prices are placeholder — Admin can change from Process Pricing panel
INSERT INTO process_types (code, name, description, hsn_sac_code, price_per_kg, price_per_pc, min_charge, gst_rate) VALUES
('SR',   'Stress Relieving',   'Stress relieving to remove residual stresses without change in hardness',   '998898',  80.00, NULL, 400.00, 18.00),
('HRD',  'Hardening',          'Austenitizing and quenching to achieve required hardness',                  '998898', 120.00, NULL, 500.00, 18.00),
('TMP',  'Tempering',          'Tempering after hardening to achieve toughness at required HRC',            '998898',  60.00, NULL, 300.00, 18.00),
('ANN',  'Annealing',          'Full annealing — softening, stress relief and grain refinement',            '998898',  90.00, NULL, 400.00, 18.00),
('BRZ',  'Brazing',            'High temperature vacuum brazing of tool steel components',                  '998898', 200.00, NULL, 600.00, 18.00),
('PN',   'Plasma Nitriding',   'Plasma / Ion nitriding for surface hardness and wear resistance',           '998898', 180.00, NULL, 800.00, 18.00),
('SZ',   'Sub Zero',           'Sub-zero / cryogenic treatment at -80°C to -196°C after hardening',        '998898', 220.00, NULL, 700.00, 18.00),
('SC',   'Soak Clean',         'Pre/post process soak cleaning to remove oils, scales and contaminants',    '998898',  40.00, NULL, 250.00, 18.00);

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
-- INDEXES
-- ============================================================
CREATE INDEX idx_job_cards_status     ON job_cards(status);
CREATE INDEX idx_job_cards_part       ON job_cards(part_id);
CREATE INDEX idx_challans_status      ON jobwork_challans(status);
CREATE INDEX idx_challans_date        ON jobwork_challans(challan_date);
CREATE INDEX idx_invoices_date        ON tax_invoices(invoice_date);
CREATE INDEX idx_invoices_payment     ON tax_invoices(payment_status);
CREATE INDEX idx_certs_date           ON test_certificates(issue_date);
CREATE INDEX idx_audit_user           ON audit_logs(user_id);
CREATE INDEX idx_audit_table          ON audit_logs(table_name, record_id);
-- Indexes for Purchase & Manufacturing
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_grns_status          ON grns(status);
CREATE INDEX idx_grns_po              ON grns(purchase_order_id);
CREATE INDEX idx_inventory_item       ON inventories(item_id);
CREATE INDEX idx_manufacturing_batches_status ON manufacturing_batches(status);
CREATE INDEX idx_vht_runsheets_status ON vht_runsheets(status);
CREATE INDEX idx_vht_runsheets_batch  ON vht_runsheets(batch_id);
CREATE INDEX idx_production_plans_date ON production_plans(plan_date);
CREATE INDEX idx_shifts_plan          ON shifts(plan_id);

-- ============================================================
-- DEFAULT ADMIN USER (password: Admin@123 - bcrypt hashed)
-- ============================================================
-- password for all default users: Admin@123
INSERT INTO users (name, email, password, role) VALUES
('Admin',    'admin@sheetaldies.com',    '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'ADMIN'),
('Manager',  'manager@sheetaldies.com',  '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'MANAGER'),
('Operator', 'operator@sheetaldies.com', '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'OPERATOR');

-- Default Company Party
INSERT INTO parties (name, address, city, state, pin_code, gstin, pan, state_code, party_type) VALUES
('Sheetal Dies & Tools Pvt. Ltd.', 'D9 Sai Industrial Premises, Plot No. 40, PCNTDA, Bhosari', 'Pune', 'Maharashtra', '411026', '27AABCS1234F1Z5', 'AABCS1234F', '27', 'BOTH'),
('Sheetal Vacuum Heat Pvt. Ltd.',  'Gat No. 120, Jyotiba Nagar, Talawade', 'Pune', 'Maharashtra', '411062', '27MMMPP5678K1Z9', 'MMMPP5678K', '27', 'VENDOR');

-- Default Machines
INSERT INTO machines (code, name, type, make) VALUES
('VMC-01', 'Vertical Machining Centre 1', 'VMC', 'BFW'),
('VMC-02', 'Vertical Machining Centre 2', 'VMC', 'Haas'),
('CNC-04', 'CNC Turning Centre 4',        'CNC', 'Mazak'),
('RD-01',  'Radial Drilling Machine',      'Radial Drill', 'HMT'),
('CONV-01','Conventional Lathe',           'Conventional', 'HMT');
