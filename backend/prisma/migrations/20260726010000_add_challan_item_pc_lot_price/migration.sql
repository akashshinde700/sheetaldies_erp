-- Add per-piece and lot pricing reference fields to challan_items (Inward item table).
ALTER TABLE `challan_items`
  ADD COLUMN `price_per_pc` DECIMAL(12, 2) NULL AFTER `amount`,
  ADD COLUMN `lot_price`    DECIMAL(12, 2) NULL AFTER `price_per_pc`;
