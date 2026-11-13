CREATE TABLE rate_limit_next (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_request INTEGER NOT NULL,
  CONSTRAINT rate_limit_count_check CHECK (count >= 0)
)
STRICT;

INSERT INTO rate_limit_next
  (key, count, last_request)
SELECT
  key,
  count,
  last_request
FROM rate_limit;

DROP TABLE rate_limit;

ALTER TABLE rate_limit_next
RENAME TO rate_limit;
