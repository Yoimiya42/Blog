CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CONSTRAINT account_user_id_fk
    FOREIGN KEY (user_id) REFERENCES user (id)
      ON DELETE CASCADE
)
STRICT;

CREATE INDEX account_user_id_idx ON account (user_id);

CREATE UNIQUE INDEX account_provider_account_uidx ON account (
  provider_id,
  account_id
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CONSTRAINT session_user_id_fk
    FOREIGN KEY (user_id) REFERENCES user (id)
      ON DELETE CASCADE
)
STRICT;

CREATE INDEX session_user_id_idx ON session (user_id);
CREATE UNIQUE INDEX session_token_uidx ON session (token);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
)
STRICT;

CREATE INDEX verification_identifier_idx ON verification (identifier);

CREATE TABLE rate_limit (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_request INTEGER NOT NULL,
  CONSTRAINT rate_limit_count_check CHECK (count >= 0)
)
STRICT;

CREATE UNIQUE INDEX rate_limit_key_uidx ON rate_limit (key);
