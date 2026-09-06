CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'VISITOR',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_seen_at INTEGER,
  CONSTRAINT user_email_verified_check CHECK (email_verified IN (0, 1)),
  CONSTRAINT user_role_check CHECK (role IN ('VISITOR', 'OWNER'))
)
STRICT;

CREATE UNIQUE INDEX user_email_uidx ON user (email);
