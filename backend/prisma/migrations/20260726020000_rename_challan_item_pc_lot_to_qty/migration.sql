-- price_per_pc / lot_price were added in the previous migration as rate fields,
-- but the actual requirement is received-quantity fields (how many pieces / how
-- many lots came in) — the rate itself already lives on the party/process master.
-- No production data exists in these columns yet, so a straight rename is safe.
ALTER TABLE `challan_items`
  CHANGE COLUMN `price_per_pc` `pc_qty`  DECIMAL(12, 3) NULL,
  CHANGE COLUMN `lot_price`    `lot_qty` DECIMAL(12, 3) NULL;
