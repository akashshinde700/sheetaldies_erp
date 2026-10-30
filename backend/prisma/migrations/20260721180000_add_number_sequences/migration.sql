-- Atomic monotonic counters for document numbering (invoice numbers, job
-- card numbers, ...). Keyed by an arbitrary string so deleting the
-- underlying record can never rewind or reissue a previously-used number.
CREATE TABLE `number_sequences` (
    `key` VARCHAR(80) NOT NULL,
    `next_value` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
);
