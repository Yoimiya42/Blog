CREATE TABLE rate_limit_with_id (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_request INTEGER NOT NULL,
  CONSTRAINT rate_limit_count_check CHECK (count >= 0)
)
STRICT;

INSERT INTO rate_limit_with_id
  (id, key, count, last_request)
SELECT
  lower(hex(randomblob(16))),
  key,
  count,
  last_request
FROM rate_limit;

DROP TABLE rate_limit;

ALTER TABLE rate_limit_with_id
RENAME TO rate_limit;

CREATE UNIQUE INDEX rate_limit_key_uidx ON rate_limit (key);
