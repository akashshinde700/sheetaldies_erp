-- ============================================================
-- SHEETAL DIES ERP - LIVE SAFE SCHEMA SYNC
-- Use on existing database only (idempotent patch script)
-- ============================================================

USE sheetal_dies_erp;

DROP PROCEDURE IF EXISTS ensure_index;
DROP PROCEDURE IF EXISTS ensure_fk;
DROP PROCEDURE IF EXISTS ensure_column;
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

CREATE PROCEDURE ensure_column(IN p_table VARCHAR(128), IN p_column VARCHAR(128), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    SET @sql = p_ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Incoming inspection: additional fields used by app
CALL ensure_column('incoming_inspections', 'cat_welded', 'ALTER TABLE incoming_inspections ADD COLUMN cat_welded BOOLEAN NOT NULL DEFAULT FALSE AFTER cat_normal');
CALL ensure_column('incoming_inspections', 'cat_rusty', 'ALTER TABLE incoming_inspections ADD COLUMN cat_rusty BOOLEAN NOT NULL DEFAULT FALSE AFTER cat_dent_damage');
CALL ensure_column('incoming_inspections', 'visual_before', 'ALTER TABLE incoming_inspections ADD COLUMN visual_before BOOLEAN NOT NULL DEFAULT FALSE AFTER proc_slow_cool');
CALL ensure_column('incoming_inspections', 'visual_after', 'ALTER TABLE incoming_inspections ADD COLUMN visual_after BOOLEAN NOT NULL DEFAULT FALSE AFTER visual_before');
CALL ensure_column('incoming_inspections', 'mpi_before', 'ALTER TABLE incoming_inspections ADD COLUMN mpi_before BOOLEAN NOT NULL DEFAULT FALSE AFTER visual_after');
CALL ensure_column('incoming_inspections', 'mpi_after', 'ALTER TABLE incoming_inspections ADD COLUMN mpi_after BOOLEAN NOT NULL DEFAULT FALSE AFTER mpi_before');
CALL ensure_column('incoming_inspections', 'mpi_nil', 'ALTER TABLE incoming_inspections ADD COLUMN mpi_nil BOOLEAN NOT NULL DEFAULT FALSE AFTER mpi_after');
CALL ensure_column('incoming_inspections', 'hardness_after_1', 'ALTER TABLE incoming_inspections ADD COLUMN hardness_after_1 DECIMAL(6,2) AFTER achieved_hardness');
CALL ensure_column('incoming_inspections', 'hardness_after_2', 'ALTER TABLE incoming_inspections ADD COLUMN hardness_after_2 DECIMAL(6,2) AFTER hardness_after_1');
CALL ensure_column('incoming_inspections', 'hardness_after_3', 'ALTER TABLE incoming_inspections ADD COLUMN hardness_after_3 DECIMAL(6,2) AFTER hardness_after_2');
CALL ensure_column('incoming_inspections', 'hardness_after_4', 'ALTER TABLE incoming_inspections ADD COLUMN hardness_after_4 DECIMAL(6,2) AFTER hardness_after_3');
CALL ensure_column('incoming_inspections', 'urgent', 'ALTER TABLE incoming_inspections ADD COLUMN urgent BOOLEAN NOT NULL DEFAULT FALSE AFTER image5');

CALL ensure_column('heat_treatment_processes', 'temp_time', 'ALTER TABLE heat_treatment_processes ADD COLUMN temp_time VARCHAR(100) AFTER cycle_no');
CALL ensure_column('heat_treatment_processes', 'process_date', 'ALTER TABLE heat_treatment_processes ADD COLUMN process_date DATE AFTER end_time');
CALL ensure_column('heat_treatment_processes', 'loading_by', 'ALTER TABLE heat_treatment_processes ADD COLUMN loading_by VARCHAR(100) AFTER process_date');

CALL ensure_column('dispatch_challan_items', 'source_challan_item_id', 'ALTER TABLE dispatch_challan_items ADD COLUMN source_challan_item_id INT AFTER item_id');
CALL ensure_index('dispatch_challan_items', 'idx_dispatch_items_source_challan_item', 'CREATE INDEX idx_dispatch_items_source_challan_item ON dispatch_challan_items(source_challan_item_id)');
CALL ensure_fk('dispatch_challan_items', 'fk_dispatch_items_source_challan_item', 'ALTER TABLE dispatch_challan_items ADD CONSTRAINT fk_dispatch_items_source_challan_item FOREIGN KEY (source_challan_item_id) REFERENCES challan_items(id) ON DELETE SET NULL');

CALL ensure_column('invoice_items', 'cert_id', 'ALTER TABLE invoice_items ADD COLUMN cert_id INT AFTER invoice_id');
CALL ensure_column('invoice_items', 'source_challan_item_id', 'ALTER TABLE invoice_items ADD COLUMN source_challan_item_id INT AFTER cert_id');
CALL ensure_index('invoice_items', 'idx_invoice_items_cert', 'CREATE INDEX idx_invoice_items_cert ON invoice_items(cert_id)');
CALL ensure_index('invoice_items', 'idx_invoice_items_source_challan_item', 'CREATE INDEX idx_invoice_items_source_challan_item ON invoice_items(source_challan_item_id)');
CALL ensure_fk('invoice_items', 'fk_invoice_items_cert', 'ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_cert FOREIGN KEY (cert_id) REFERENCES test_certificates(id) ON DELETE SET NULL');
CALL ensure_fk('invoice_items', 'fk_invoice_items_source_challan_item', 'ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_source_challan_item FOREIGN KEY (source_challan_item_id) REFERENCES challan_items(id) ON DELETE SET NULL');

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
CALL ensure_index('inventory_movements', 'idx_inventory_movements_item_created', 'CREATE INDEX idx_inventory_movements_item_created ON inventory_movements(item_id, created_at)');
CALL ensure_index('inventory_movements', 'idx_inventory_movements_source_created', 'CREATE INDEX idx_inventory_movements_source_created ON inventory_movements(source, created_at)');

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

-- Plant/furnace reporting tables
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

-- VHT runsheet: execution/doc columns
CALL ensure_column('vht_runsheets', 'run_date', 'ALTER TABLE vht_runsheets ADD COLUMN run_date DATE AFTER furnace_id');
CALL ensure_column('vht_runsheets', 'cycle_end_time', 'ALTER TABLE vht_runsheets ADD COLUMN cycle_end_time VARCHAR(10) AFTER run_date');
CALL ensure_column('vht_runsheets', 'total_time_display', 'ALTER TABLE vht_runsheets ADD COLUMN total_time_display VARCHAR(20) AFTER cycle_end_time');
CALL ensure_column('vht_runsheets', 'mr_start', 'ALTER TABLE vht_runsheets ADD COLUMN mr_start INT AFTER total_time_display');
CALL ensure_column('vht_runsheets', 'mr_end', 'ALTER TABLE vht_runsheets ADD COLUMN mr_end INT AFTER mr_start');
CALL ensure_column('vht_runsheets', 'total_mr', 'ALTER TABLE vht_runsheets ADD COLUMN total_mr INT AFTER mr_end');
CALL ensure_column('vht_runsheets', 'loading_operator_name', 'ALTER TABLE vht_runsheets ADD COLUMN loading_operator_name VARCHAR(100) AFTER total_mr');
CALL ensure_column('vht_runsheets', 'doc_rev_no', 'ALTER TABLE vht_runsheets ADD COLUMN doc_rev_no VARCHAR(20) AFTER loading_operator_name');
CALL ensure_column('vht_runsheets', 'doc_effective_date', 'ALTER TABLE vht_runsheets ADD COLUMN doc_effective_date DATE AFTER doc_rev_no');
CALL ensure_column('vht_runsheets', 'doc_page_of', 'ALTER TABLE vht_runsheets ADD COLUMN doc_page_of VARCHAR(20) AFTER doc_effective_date');
CALL ensure_column('vht_runsheets', 'hardening_type', 'ALTER TABLE vht_runsheets ADD COLUMN hardening_type VARCHAR(200) AFTER cycle_time');
CALL ensure_column('vht_runsheets', 'quench_pressure_bar', 'ALTER TABLE vht_runsheets ADD COLUMN quench_pressure_bar DECIMAL(6,2) AFTER hardening_type');
CALL ensure_column('vht_runsheets', 'fan_rpm', 'ALTER TABLE vht_runsheets ADD COLUMN fan_rpm INT AFTER quench_pressure_bar');
CALL ensure_column('vht_runsheets', 'fixtures_position', 'ALTER TABLE vht_runsheets ADD COLUMN fixtures_position VARCHAR(120) AFTER fan_rpm');
CALL ensure_column('vht_runsheets', 'temp_graph_points', 'ALTER TABLE vht_runsheets ADD COLUMN temp_graph_points JSON AFTER fixtures_position');
CALL ensure_column('vht_runsheets', 'operator_sign', 'ALTER TABLE vht_runsheets ADD COLUMN operator_sign VARCHAR(150) AFTER temp_graph_points');
CALL ensure_column('vht_runsheets', 'supervisor_sign', 'ALTER TABLE vht_runsheets ADD COLUMN supervisor_sign VARCHAR(150) AFTER operator_sign');
CALL ensure_column('vht_runsheets', 'supervisor_verified_at', 'ALTER TABLE vht_runsheets ADD COLUMN supervisor_verified_at DATETIME AFTER supervisor_sign');
CALL ensure_column('vht_runsheets', 'verification_note', 'ALTER TABLE vht_runsheets ADD COLUMN verification_note TEXT AFTER supervisor_verified_at');
CALL ensure_index('vht_runsheets', 'idx_vht_runsheets_run_date_furnace', 'CREATE INDEX idx_vht_runsheets_run_date_furnace ON vht_runsheets(run_date, furnace_id)');

CALL ensure_column('vht_runsheet_items', 'job_card_id', 'ALTER TABLE vht_runsheet_items ADD COLUMN job_card_id INT AFTER runsheet_id');
CALL ensure_column('vht_runsheet_items', 'customer_name', 'ALTER TABLE vht_runsheet_items ADD COLUMN customer_name VARCHAR(200) AFTER item_id');
CALL ensure_column('vht_runsheet_items', 'job_description', 'ALTER TABLE vht_runsheet_items ADD COLUMN job_description VARCHAR(300) AFTER customer_name');
CALL ensure_column('vht_runsheet_items', 'material_grade', 'ALTER TABLE vht_runsheet_items ADD COLUMN material_grade VARCHAR(100) AFTER job_description');
CALL ensure_column('vht_runsheet_items', 'hrc_required', 'ALTER TABLE vht_runsheet_items ADD COLUMN hrc_required VARCHAR(50) AFTER material_grade');
CALL ensure_column('vht_runsheet_items', 'weight_kg', 'ALTER TABLE vht_runsheet_items ADD COLUMN weight_kg DECIMAL(10,3) AFTER quantity');
CALL ensure_index('vht_runsheet_items', 'idx_vht_runsheet_items_job_card', 'CREATE INDEX idx_vht_runsheet_items_job_card ON vht_runsheet_items(job_card_id)');
CALL ensure_fk('vht_runsheet_items', 'fk_vht_runsheet_items_job_card', 'ALTER TABLE vht_runsheet_items ADD CONSTRAINT fk_vht_runsheet_items_job_card FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE SET NULL');

-- Safe seed upserts
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Admin',    'admin@sheetaldies.com',    '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'ADMIN'),
('Manager',  'manager@sheetaldies.com',  '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'MANAGER'),
('Operator', 'operator@sheetaldies.com', '$2a$10$K3yiBl9HBAHzPBg/3IleqOGWX83LaJmGCnfga71cIHbtPDGv38Ioq', 'OPERATOR');

INSERT IGNORE INTO parties (name, address, city, state, pin_code, gstin, pan, state_code, party_type) VALUES
('Sheetal Dies & Tools Pvt. Ltd.', 'D9 Sai Industrial Premises, Plot No. 40, PCNTDA, Bhosari', 'Pune', 'Maharashtra', '411026', '27AABCS1234F1Z5', 'AABCS1234F', '27', 'BOTH'),
('Sheetal Vacuum Heat Pvt. Ltd.',  'Gat No. 120, Jyotiba Nagar, Talawade', 'Pune', 'Maharashtra', '411062', '27MMMPP5678K1Z9', 'MMMPP5678K', '27', 'VENDOR');

INSERT IGNORE INTO machines (code, name, type, make) VALUES
('VMC-01', 'Vertical Machining Centre 1', 'VMC', 'BFW'),
('VMC-02', 'Vertical Machining Centre 2', 'VMC', 'Haas'),
('CNC-04', 'CNC Turning Centre 4',        'CNC', 'Mazak'),
('RD-01',  'Radial Drilling Machine',      'Radial Drill', 'HMT'),
('CONV-01','Conventional Lathe',           'Conventional', 'HMT');

INSERT IGNORE INTO process_types (code, name, description, hsn_sac_code, price_per_kg, price_per_pc, min_charge, gst_rate, is_active, created_at, updated_at) VALUES
('SR',   'Stress Relieving',   'Stress relieving to remove residual stresses without change in hardness',    '998898',  80.00, NULL, 400.00, 18.00, TRUE, NOW(), NOW()),
('HRD',  'Hardening',          'Austenitizing and quenching to achieve required hardness',                   '998898', 120.00, NULL, 500.00, 18.00, TRUE, NOW(), NOW()),
('TMP',  'Tempering',          'Tempering after hardening to achieve toughness at required HRC',             '998898',  60.00, NULL, 300.00, 18.00, TRUE, NOW(), NOW()),
('ANN',  'Annealing',          'Full annealing - softening, stress relief and grain refinement',             '998898',  90.00, NULL, 400.00, 18.00, TRUE, NOW(), NOW()),
('BRZ',  'Brazing',            'High temperature vacuum brazing of tool steel components',                   '998898', 200.00, NULL, 600.00, 18.00, TRUE, NOW(), NOW()),
('PN',   'Plasma Nitriding',   'Plasma / Ion nitriding for surface hardness and wear resistance',            '998898', 180.00, NULL, 800.00, 18.00, TRUE, NOW(), NOW()),
('NIT',  'Nitriding',          'Gas nitriding process for surface hardening and fatigue life',               '998898', 160.00, NULL, 700.00, 18.00, TRUE, NOW(), NOW()),
('SZ',   'Sub Zero',           'Sub-zero / cryogenic treatment at -80C to -196C after hardening',           '998898', 220.00, NULL, 700.00, 18.00, TRUE, NOW(), NOW()),
('SC',   'Soak Clean',         'Pre/post process soak cleaning to remove oils, scales and contaminants',     '998898',  40.00, NULL, 250.00, 18.00, TRUE, NOW(), NOW()),
('SLC',  'Slow Cool',          'Controlled slow cooling cycle to reduce thermal stress and cracking',        '998898',  55.00, NULL, 300.00, 18.00, TRUE, NOW(), NOW());
