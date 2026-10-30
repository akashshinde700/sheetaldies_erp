-- Maps a party to the ledger name it carries in Tally, for the common case
-- where the two systems spell the same customer differently. NULL means the
-- party's own name is used, which is what every existing row should do.
ALTER TABLE `parties`
  ADD COLUMN `tally_ledger_name` VARCHAR(200) NULL;
