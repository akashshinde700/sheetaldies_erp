-- Change dispatch_challan_items.quantity from INT to DECIMAL(12,3)
-- to match challan_items.quantity and support fractional quantities
ALTER TABLE `dispatch_challan_items`
  MODIFY COLUMN `quantity` DECIMAL(12,3) NOT NULL;
