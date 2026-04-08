-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER') NOT NULL DEFAULT 'OPERATOR',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `otp_token` VARCHAR(10) NULL,
    `otp_expiry` DATETIME(3) NULL,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `party_code` VARCHAR(50) NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pin_code` VARCHAR(10) NULL,
    `gstin` VARCHAR(20) NULL,
    `pan` VARCHAR(20) NULL,
    `state_code` VARCHAR(5) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(150) NULL,
    `party_type` ENUM('CUSTOMER', 'VENDOR', 'BOTH') NOT NULL DEFAULT 'CUSTOMER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `bank_account_holder` VARCHAR(200) NULL,
    `bank_name` VARCHAR(200) NULL,
    `account_no` VARCHAR(50) NULL,
    `ifsc_code` VARCHAR(20) NULL,
    `swift_code` VARCHAR(20) NULL,
    `vat_tin` VARCHAR(30) NULL,
    `cst_no` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parties_party_code_key`(`party_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_no` VARCHAR(100) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `hsn_code` VARCHAR(20) NULL,
    `material` VARCHAR(100) NULL,
    `drawing_no` VARCHAR(100) NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'NOS',
    `weight_kg` DECIMAL(10, 3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `items_part_no_key`(`part_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `machines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` VARCHAR(100) NULL,
    `make` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `machines_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `hsn_sac_code` VARCHAR(20) NULL,
    `price_per_kg` DECIMAL(10, 2) NULL,
    `price_per_pc` DECIMAL(10, 2) NULL,
    `min_charge` DECIMAL(10, 2) NULL,
    `gst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `process_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_card_no` VARCHAR(50) NOT NULL,
    `die_no` VARCHAR(50) NULL,
    `your_no` VARCHAR(50) NULL,
    `heat_no` VARCHAR(50) NULL,
    `die_material` VARCHAR(100) NULL,
    `part_id` INTEGER NOT NULL,
    `customer_id` INTEGER NULL,
    `operation_no` VARCHAR(50) NULL,
    `drawing_no` VARCHAR(100) NULL,
    `machine_id` INTEGER NULL,
    `operator_name` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL,
    `total_weight` DECIMAL(10, 3) NULL,
    `time_taken` DECIMAL(8, 2) NULL,
    `start_date` DATE NULL,
    `received_date` DATE NULL,
    `due_date` DATE NULL,
    `end_date` DATE NULL,
    `issue_date` DATE NULL,
    `issue_by` VARCHAR(100) NULL,
    `operation_mode` VARCHAR(30) NULL,
    `spec_instr_cert` BOOLEAN NOT NULL DEFAULT false,
    `spec_instr_mpi_rep` BOOLEAN NOT NULL DEFAULT false,
    `spec_instr_graph` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD') NOT NULL DEFAULT 'CREATED',
    `remarks` TEXT NULL,
    `image1` VARCHAR(255) NULL,
    `image2` VARCHAR(255) NULL,
    `image3` VARCHAR(255) NULL,
    `image4` VARCHAR(255) NULL,
    `image5` VARCHAR(255) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_cards_job_card_no_key`(`job_card_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incoming_inspections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_card_id` INTEGER NOT NULL,
    `cat_normal` BOOLEAN NOT NULL DEFAULT false,
    `cat_crack_risk` BOOLEAN NOT NULL DEFAULT false,
    `cat_distortion_risk` BOOLEAN NOT NULL DEFAULT false,
    `cat_critical_finishing` BOOLEAN NOT NULL DEFAULT false,
    `cat_dent_damage` BOOLEAN NOT NULL DEFAULT false,
    `cat_cavity` BOOLEAN NOT NULL DEFAULT false,
    `cat_others` BOOLEAN NOT NULL DEFAULT false,
    `other_defects` VARCHAR(300) NULL,
    `process_type_id` INTEGER NULL,
    `proc_stress_relieving` BOOLEAN NOT NULL DEFAULT false,
    `proc_hardening` BOOLEAN NOT NULL DEFAULT false,
    `proc_tempering` BOOLEAN NOT NULL DEFAULT false,
    `proc_annealing` BOOLEAN NOT NULL DEFAULT false,
    `proc_brazing` BOOLEAN NOT NULL DEFAULT false,
    `proc_plasma_nitriding` BOOLEAN NOT NULL DEFAULT false,
    `proc_nitriding` BOOLEAN NOT NULL DEFAULT false,
    `proc_sub_zero` BOOLEAN NOT NULL DEFAULT false,
    `proc_soak_clean` BOOLEAN NOT NULL DEFAULT false,
    `proc_slow_cool` BOOLEAN NOT NULL DEFAULT false,
    `visual_inspection` BOOLEAN NOT NULL DEFAULT false,
    `mpi_inspection` BOOLEAN NOT NULL DEFAULT false,
    `required_hardness_min` DECIMAL(6, 2) NULL,
    `required_hardness_max` DECIMAL(6, 2) NULL,
    `hardness_unit` VARCHAR(10) NOT NULL DEFAULT 'HRC',
    `achieved_hardness` DECIMAL(6, 2) NULL,
    `distortion_points_before` JSON NULL,
    `distortion_points_after` JSON NULL,
    `image1` VARCHAR(255) NULL,
    `image2` VARCHAR(255) NULL,
    `image3` VARCHAR(255) NULL,
    `image4` VARCHAR(255) NULL,
    `image5` VARCHAR(255) NULL,
    `packed_qty` INTEGER NULL,
    `packed_by` VARCHAR(100) NULL,
    `incoming_inspection_by` VARCHAR(100) NULL,
    `final_inspection_by` VARCHAR(100) NULL,
    `inspected_by` VARCHAR(100) NULL,
    `inspection_date` DATE NULL,
    `remarks` TEXT NULL,
    `inspection_status` ENUM('PENDING', 'PASS', 'FAIL', 'CONDITIONAL') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `incoming_inspections_job_card_id_key`(`job_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `heat_treatment_processes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inspection_id` INTEGER NOT NULL,
    `process_type_id` INTEGER NULL,
    `equipment` VARCHAR(100) NULL,
    `cycle_no` INTEGER NULL,
    `temp_from` DECIMAL(8, 2) NULL,
    `temp_to` DECIMAL(8, 2) NULL,
    `hold_time_min` INTEGER NULL,
    `start_time` DATETIME(3) NULL,
    `end_time` DATETIME(3) NULL,
    `atmosphere` VARCHAR(100) NULL,
    `uom` VARCHAR(20) NULL,
    `result` VARCHAR(100) NULL,
    `signed_by` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobwork_challans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_no` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `job_card_id` INTEGER NULL,
    `from_party_id` INTEGER NOT NULL,
    `to_party_id` INTEGER NOT NULL,
    `invoice_ch_no` VARCHAR(50) NULL,
    `invoice_ch_date` DATE NULL,
    `transport_mode` VARCHAR(100) NULL,
    `vehicle_no` VARCHAR(30) NULL,
    `dispatch_date` DATE NULL,
    `due_date` DATE NULL,
    `processing_notes` TEXT NULL,
    `delivery_person` VARCHAR(100) NULL,
    `received_date` DATE NULL,
    `nature_of_process` VARCHAR(200) NULL,
    `qty_returned` INTEGER NULL,
    `rework_qty` INTEGER NULL,
    `scrap_qty_kg` DECIMAL(8, 3) NULL,
    `scrap_details` TEXT NULL,
    `processor_sign` VARCHAR(100) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `handling_charges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_value` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cgst_rate` DECIMAL(5, 2) NULL,
    `cgst_amount` DECIMAL(12, 2) NULL,
    `sgst_rate` DECIMAL(5, 2) NULL,
    `sgst_amount` DECIMAL(12, 2) NULL,
    `igst_rate` DECIMAL(5, 2) NULL,
    `igst_amount` DECIMAL(12, 2) NULL,
    `grand_total` DECIMAL(12, 2) NULL,
    `status` ENUM('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jobwork_challans_challan_no_key`(`challan_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challan_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_id` INTEGER NOT NULL,
    `item_id` INTEGER NULL,
    `description` VARCHAR(300) NULL,
    `drawing_no` VARCHAR(50) NULL,
    `material` VARCHAR(100) NULL,
    `hrc` VARCHAR(30) NULL,
    `wo_no` VARCHAR(50) NULL,
    `hsn_code` VARCHAR(20) NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `qty_out` DECIMAL(12, 3) NULL,
    `uom` VARCHAR(10) NULL DEFAULT 'KGS',
    `weight` DECIMAL(12, 3) NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_challans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challan_no` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `jobwork_challan_id` INTEGER NULL,
    `from_party_id` INTEGER NOT NULL,
    `to_party_id` INTEGER NOT NULL,
    `dispatch_mode` VARCHAR(100) NULL,
    `vehicle_no` VARCHAR(30) NULL,
    `remarks` TEXT NULL,
    `status` ENUM('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dispatch_challans_challan_no_key`(`challan_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_challan_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispatch_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `description` VARCHAR(300) NULL,
    `quantity` INTEGER NOT NULL,
    `weight_kg` DECIMAL(10, 3) NULL,
    `remarks` VARCHAR(300) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_certificates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cert_no` VARCHAR(50) NOT NULL,
    `cert_sequence` INTEGER NULL,
    `die_material` VARCHAR(100) NULL,
    `operator_mode` VARCHAR(100) NULL,
    `cat_normal` BOOLEAN NOT NULL DEFAULT false,
    `cat_crack_risk` BOOLEAN NOT NULL DEFAULT false,
    `cat_distortion_risk` BOOLEAN NOT NULL DEFAULT false,
    `cat_critical_finishing` BOOLEAN NOT NULL DEFAULT false,
    `cat_dent_damage` BOOLEAN NOT NULL DEFAULT false,
    `cat_cavity` BOOLEAN NOT NULL DEFAULT false,
    `cat_others` BOOLEAN NOT NULL DEFAULT false,
    `proc_stress_relieving` BOOLEAN NOT NULL DEFAULT false,
    `proc_hardening` BOOLEAN NOT NULL DEFAULT false,
    `proc_tempering` BOOLEAN NOT NULL DEFAULT false,
    `proc_annealing` BOOLEAN NOT NULL DEFAULT false,
    `proc_brazing` BOOLEAN NOT NULL DEFAULT false,
    `proc_plasma_nitriding` BOOLEAN NOT NULL DEFAULT false,
    `proc_sub_zero` BOOLEAN NOT NULL DEFAULT false,
    `proc_soak_clean` BOOLEAN NOT NULL DEFAULT false,
    `job_card_id` INTEGER NULL,
    `your_po_no` VARCHAR(100) NULL,
    `your_po_date` DATE NULL,
    `your_ref_no` VARCHAR(100) NULL,
    `issue_no` VARCHAR(50) NULL,
    `issue_date` DATE NOT NULL,
    `checked_by` VARCHAR(100) NULL,
    `spec_instr_certificate` BOOLEAN NOT NULL DEFAULT true,
    `spec_instr_mpi_report` BOOLEAN NOT NULL DEFAULT false,
    `spec_instr_process_graph` BOOLEAN NOT NULL DEFAULT false,
    `delivery_date` DATE NULL,
    `special_requirements` TEXT NULL,
    `precautions` TEXT NULL,
    `customer_id` INTEGER NOT NULL,
    `issued_by_party_id` INTEGER NULL,
    `hardness_min` DECIMAL(6, 2) NULL,
    `hardness_max` DECIMAL(6, 2) NULL,
    `hardness_unit` VARCHAR(10) NOT NULL DEFAULT 'HRC',
    `temp_cycle_data` JSON NULL,
    `heat_process_data` JSON NULL,
    `distortion_before` JSON NULL,
    `distortion_after` JSON NULL,
    `image1` VARCHAR(255) NULL,
    `image2` VARCHAR(255) NULL,
    `image3` VARCHAR(255) NULL,
    `image4` VARCHAR(255) NULL,
    `image5` VARCHAR(255) NULL,
    `issued_to` VARCHAR(100) NULL,
    `heat_no` VARCHAR(50) NULL,
    `dispatch_mode` VARCHAR(100) NULL,
    `dispatch_challan_no` VARCHAR(100) NULL,
    `dispatch_challan_date` DATE NULL,
    `dispatched_through` VARCHAR(100) NULL,
    `packed_qty` INTEGER NULL,
    `packed_by` VARCHAR(100) NULL,
    `approved_by` VARCHAR(100) NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `test_certificates_cert_no_key`(`cert_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cert_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cert_id` INTEGER NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `weight_per_pc` DECIMAL(10, 3) NULL,
    `total_weight` DECIMAL(10, 3) NULL,
    `sampling_plan` VARCHAR(100) NULL,
    `remarks` VARCHAR(300) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cert_inspection_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cert_id` INTEGER NOT NULL,
    `inspection_type` VARCHAR(100) NOT NULL,
    `parameter` VARCHAR(200) NULL,
    `required_value` VARCHAR(100) NULL,
    `achieved_value` VARCHAR(100) NULL,
    `result` VARCHAR(191) NOT NULL DEFAULT 'OK',
    `final_inspection` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_no` VARCHAR(50) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `dispatch_date` DATE NULL,
    `from_party_id` INTEGER NOT NULL,
    `to_party_id` INTEGER NOT NULL,
    `challan_ref` VARCHAR(100) NULL,
    `po_ref` VARCHAR(100) NULL,
    `job_card_ref` VARCHAR(100) NULL,
    `other_references` VARCHAR(300) NULL,
    `challan_id` INTEGER NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cgst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 9.00,
    `cgst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sgst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 9.00,
    `sgst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `igst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `igst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `transport_freight` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tcs_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `tcs_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `extra_amt` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `grand_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_in_words` VARCHAR(300) NULL,
    `tax_amount_in_words` VARCHAR(300) NULL,
    `dispatch_doc_no` VARCHAR(100) NULL,
    `e_way_bill_no` VARCHAR(50) NULL,
    `payment_status` ENUM('PENDING', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'PENDING',
    `paid_date` DATE NULL,
    `payment_ref` VARCHAR(100) NULL,
    `sent_to_tally` BOOLEAN NOT NULL DEFAULT false,
    `sent_to_tally_at` DATETIME(3) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tax_invoices_invoice_no_key`(`invoice_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `cert_id` INTEGER NULL,
    `description` VARCHAR(300) NOT NULL,
    `material` VARCHAR(100) NULL,
    `hrc` VARCHAR(30) NULL,
    `wo_no` VARCHAR(50) NULL,
    `hsn_sac` VARCHAR(20) NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'KGS',
    `weight` DECIMAL(12, 3) NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `process_type_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `table_name` VARCHAR(100) NULL,
    `record_id` INTEGER NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `po_number` VARCHAR(50) NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `po_date` DATE NOT NULL,
    `expected_delivery` DATE NULL,
    `status` ENUM('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `remarks` TEXT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_po_number_key`(`po_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_number` VARCHAR(50) NOT NULL,
    `purchase_order_id` INTEGER NOT NULL,
    `grn_date` DATE NOT NULL,
    `status` ENUM('RECEIVED', 'ACCEPTED', 'PARTIAL_REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
    `remarks` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `grns_grn_number_key`(`grn_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grn_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grn_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity_received` INTEGER NOT NULL,
    `quantity_accepted` INTEGER NOT NULL,
    `quantity_rejected` INTEGER NOT NULL,
    `remarks` VARCHAR(300) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `quantity_on_hand` INTEGER NOT NULL,
    `reorder_level` INTEGER NOT NULL,
    `last_restock_date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventories_item_id_key`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manufacturing_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_number` VARCHAR(50) NOT NULL,
    `batch_date` DATE NOT NULL,
    `status` ENUM('CREATED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `remarks` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `manufacturing_batches_batch_number_key`(`batch_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manufacturing_batch_jobcards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `job_card_id` INTEGER NOT NULL,

    UNIQUE INDEX `manufacturing_batch_jobcards_batch_id_job_card_id_key`(`batch_id`, `job_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vht_runsheets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `runsheet_number` VARCHAR(50) NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `furnace_id` INTEGER NOT NULL,
    `temp_profile` VARCHAR(200) NULL,
    `cycle_time` INTEGER NOT NULL DEFAULT 240,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `actual_output` INTEGER NULL,
    `remarks` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vht_runsheets_runsheet_number_key`(`runsheet_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vht_runsheet_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `runsheet_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `planned_slot` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `plan_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `shift_number` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `machinery_assigned` VARCHAR(100) NULL,
    `operator_assigned` VARCHAR(100) NULL,
    `planned_output` INTEGER NOT NULL,
    `actual_output` INTEGER NULL,
    `reason` VARCHAR(300) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `process_types` ADD CONSTRAINT `process_types_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cards` ADD CONSTRAINT `job_cards_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cards` ADD CONSTRAINT `job_cards_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cards` ADD CONSTRAINT `job_cards_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cards` ADD CONSTRAINT `job_cards_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incoming_inspections` ADD CONSTRAINT `incoming_inspections_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incoming_inspections` ADD CONSTRAINT `incoming_inspections_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heat_treatment_processes` ADD CONSTRAINT `heat_treatment_processes_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `incoming_inspections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heat_treatment_processes` ADD CONSTRAINT `heat_treatment_processes_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobwork_challans` ADD CONSTRAINT `jobwork_challans_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobwork_challans` ADD CONSTRAINT `jobwork_challans_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobwork_challans` ADD CONSTRAINT `jobwork_challans_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobwork_challans` ADD CONSTRAINT `jobwork_challans_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_items` ADD CONSTRAINT `challan_items_challan_id_fkey` FOREIGN KEY (`challan_id`) REFERENCES `jobwork_challans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_items` ADD CONSTRAINT `challan_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challans` ADD CONSTRAINT `dispatch_challans_jobwork_challan_id_fkey` FOREIGN KEY (`jobwork_challan_id`) REFERENCES `jobwork_challans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challans` ADD CONSTRAINT `dispatch_challans_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challans` ADD CONSTRAINT `dispatch_challans_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challans` ADD CONSTRAINT `dispatch_challans_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challan_items` ADD CONSTRAINT `dispatch_challan_items_dispatch_id_fkey` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatch_challans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_challan_items` ADD CONSTRAINT `dispatch_challan_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_certificates` ADD CONSTRAINT `test_certificates_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_certificates` ADD CONSTRAINT `test_certificates_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_certificates` ADD CONSTRAINT `test_certificates_issued_by_party_id_fkey` FOREIGN KEY (`issued_by_party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_certificates` ADD CONSTRAINT `test_certificates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cert_items` ADD CONSTRAINT `cert_items_cert_id_fkey` FOREIGN KEY (`cert_id`) REFERENCES `test_certificates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cert_inspection_results` ADD CONSTRAINT `cert_inspection_results_cert_id_fkey` FOREIGN KEY (`cert_id`) REFERENCES `test_certificates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_invoices` ADD CONSTRAINT `tax_invoices_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_invoices` ADD CONSTRAINT `tax_invoices_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_invoices` ADD CONSTRAINT `tax_invoices_challan_id_fkey` FOREIGN KEY (`challan_id`) REFERENCES `jobwork_challans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_invoices` ADD CONSTRAINT `tax_invoices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `tax_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_cert_id_fkey` FOREIGN KEY (`cert_id`) REFERENCES `test_certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grns` ADD CONSTRAINT `grns_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grns` ADD CONSTRAINT `grns_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grn_items` ADD CONSTRAINT `grn_items_grn_id_fkey` FOREIGN KEY (`grn_id`) REFERENCES `grns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grn_items` ADD CONSTRAINT `grn_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing_batches` ADD CONSTRAINT `manufacturing_batches_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing_batch_jobcards` ADD CONSTRAINT `manufacturing_batch_jobcards_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `manufacturing_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing_batch_jobcards` ADD CONSTRAINT `manufacturing_batch_jobcards_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheets` ADD CONSTRAINT `vht_runsheets_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `manufacturing_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheets` ADD CONSTRAINT `vht_runsheets_furnace_id_fkey` FOREIGN KEY (`furnace_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheets` ADD CONSTRAINT `vht_runsheets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheet_items` ADD CONSTRAINT `vht_runsheet_items_runsheet_id_fkey` FOREIGN KEY (`runsheet_id`) REFERENCES `vht_runsheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vht_runsheet_items` ADD CONSTRAINT `vht_runsheet_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plans` ADD CONSTRAINT `production_plans_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `manufacturing_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plans` ADD CONSTRAINT `production_plans_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `production_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
