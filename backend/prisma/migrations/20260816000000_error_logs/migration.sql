-- Production errors previously vanished: the error handler only logged in
-- development, and browser crashes were never reported at all.
CREATE TABLE `error_logs` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `source`       VARCHAR(20)  NOT NULL,
  `level`        VARCHAR(20)  NOT NULL DEFAULT 'error',
  `message`      TEXT         NOT NULL,
  `stack`        TEXT         NULL,
  `code`         VARCHAR(60)  NULL,
  `status_code`  INT          NULL,
  `method`       VARCHAR(10)  NULL,
  `url`          VARCHAR(500) NULL,
  `user_agent`   VARCHAR(400) NULL,
  `user_id`      INT          NULL,
  `meta`         JSON         NULL,
  `fingerprint`  VARCHAR(64)  NOT NULL,
  `count`        INT          NOT NULL DEFAULT 1,
  `last_seen_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolved`     BOOLEAN      NOT NULL DEFAULT false,
  `created_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `error_logs_fingerprint_idx` (`fingerprint`),
  INDEX `error_logs_source_resolved_idx` (`source`, `resolved`),
  INDEX `error_logs_last_seen_at_idx` (`last_seen_at`),
  CONSTRAINT `error_logs_user_id_fkey` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
