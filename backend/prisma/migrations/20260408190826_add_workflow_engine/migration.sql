-- CreateTable
CREATE TABLE `workflow_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `industry` VARCHAR(100) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workflow_templates_code_key`(`code`),
    INDEX `workflow_templates_is_active_idx`(`is_active`),
    INDEX `workflow_templates_code_version_idx`(`code`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `step_code` VARCHAR(60) NOT NULL,
    `step_name` VARCHAR(150) NOT NULL,
    `step_type` ENUM('OPERATION', 'INSPECTION', 'DECISION', 'DISPATCH', 'LOOP') NOT NULL DEFAULT 'OPERATION',
    `sequence_no` INTEGER NOT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT true,
    `is_repeatable` BOOLEAN NOT NULL DEFAULT false,
    `requires_machine` BOOLEAN NOT NULL DEFAULT false,
    `requires_qc` BOOLEAN NOT NULL DEFAULT false,
    `requires_file` BOOLEAN NOT NULL DEFAULT false,
    `allow_parallel` BOOLEAN NOT NULL DEFAULT false,
    `sla_minutes` INTEGER NULL,
    `config_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workflow_steps_template_id_sequence_no_idx`(`template_id`, `sequence_no`),
    UNIQUE INDEX `workflow_steps_template_id_step_code_key`(`template_id`, `step_code`),
    UNIQUE INDEX `workflow_steps_template_id_sequence_no_key`(`template_id`, `sequence_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_transitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `from_step_id` INTEGER NOT NULL,
    `to_step_id` INTEGER NOT NULL,
    `condition_type` ENUM('ALWAYS', 'MATERIAL_TYPE_IN', 'QC_PASS', 'QC_FAIL', 'FIELD_EQUALS') NOT NULL DEFAULT 'ALWAYS',
    `condition_expr` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `is_rework_path` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `workflow_transitions_template_id_from_step_id_priority_idx`(`template_id`, `from_step_id`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_workflows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_card_id` INTEGER NOT NULL,
    `template_id` INTEGER NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
    `current_step_id` INTEGER NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `started_by` INTEGER NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_workflows_job_card_id_key`(`job_card_id`),
    INDEX `job_workflows_status_current_step_id_idx`(`status`, `current_step_id`),
    INDEX `job_workflows_template_id_idx`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_step_tracking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_workflow_id` INTEGER NOT NULL,
    `workflow_step_id` INTEGER NOT NULL,
    `run_no` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `duration_sec` INTEGER NULL,
    `operator_name` VARCHAR(100) NULL,
    `machine_id` INTEGER NULL,
    `qc_result` ENUM('PENDING', 'PASS', 'FAIL', 'CONDITIONAL') NULL,
    `observations` TEXT NULL,
    `remarks` TEXT NULL,
    `attachments` JSON NULL,
    `input_data` JSON NULL,
    `output_data` JSON NULL,
    `executed_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_step_tracking_job_workflow_id_status_idx`(`job_workflow_id`, `status`),
    INDEX `job_step_tracking_workflow_step_id_status_idx`(`workflow_step_id`, `status`),
    INDEX `job_step_tracking_machine_id_idx`(`machine_id`),
    UNIQUE INDEX `job_step_tracking_job_workflow_id_workflow_step_id_run_no_key`(`job_workflow_id`, `workflow_step_id`, `run_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workflow_templates` ADD CONSTRAINT `workflow_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_templates` ADD CONSTRAINT `workflow_templates_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_steps` ADD CONSTRAINT `workflow_steps_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_transitions` ADD CONSTRAINT `workflow_transitions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_transitions` ADD CONSTRAINT `workflow_transitions_from_step_id_fkey` FOREIGN KEY (`from_step_id`) REFERENCES `workflow_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_transitions` ADD CONSTRAINT `workflow_transitions_to_step_id_fkey` FOREIGN KEY (`to_step_id`) REFERENCES `workflow_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_workflows` ADD CONSTRAINT `job_workflows_job_card_id_fkey` FOREIGN KEY (`job_card_id`) REFERENCES `job_cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_workflows` ADD CONSTRAINT `job_workflows_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_workflows` ADD CONSTRAINT `job_workflows_current_step_id_fkey` FOREIGN KEY (`current_step_id`) REFERENCES `workflow_steps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_workflows` ADD CONSTRAINT `job_workflows_started_by_fkey` FOREIGN KEY (`started_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_step_tracking` ADD CONSTRAINT `job_step_tracking_job_workflow_id_fkey` FOREIGN KEY (`job_workflow_id`) REFERENCES `job_workflows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_step_tracking` ADD CONSTRAINT `job_step_tracking_workflow_step_id_fkey` FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_step_tracking` ADD CONSTRAINT `job_step_tracking_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_step_tracking` ADD CONSTRAINT `job_step_tracking_executed_by_fkey` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
