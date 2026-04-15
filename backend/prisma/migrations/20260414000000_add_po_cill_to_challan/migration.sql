-- AddColumn po_no, po_date, cill_no to jobwork_challans
ALTER TABLE `jobwork_challans`
  ADD COLUMN `po_no`   VARCHAR(100) NULL AFTER `delivery_person`,
  ADD COLUMN `po_date` DATE         NULL AFTER `po_no`,
  ADD COLUMN `cill_no` VARCHAR(100) NULL AFTER `po_date`;
