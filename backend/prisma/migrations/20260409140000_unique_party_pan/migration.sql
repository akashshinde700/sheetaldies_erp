-- Unique PAN per party (multiple NULL pan still allowed in MySQL).
-- If this fails, clear or dedupe duplicate `pan` values in `parties` first, then re-apply.

CREATE UNIQUE INDEX `parties_pan_key` ON `parties`(`pan`);
