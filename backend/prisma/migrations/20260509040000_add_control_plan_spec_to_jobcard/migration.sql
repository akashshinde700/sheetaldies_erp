-- Add controlPlanNo and specification fields to job_cards table
ALTER TABLE job_cards ADD COLUMN control_plan_no VARCHAR(100);
ALTER TABLE job_cards ADD COLUMN specification TEXT;
