-- Better Auth 1.7.3 binds ISO-8601 date strings for every date field it owns.
-- The auth tables are STRICT, so SQLite rejects TEXT written to INTEGER columns
-- and every write that carries a date fails. Rebuild the Better Auth managed
-- date columns as TEXT and convert existing epoch-millisecond values to ISO text.
-- user.last_seen_at and rate_limit.last_request stay INTEGER: they are
-- application-managed epoch milliseconds, not Better Auth fields.

-- 1. New user table with TEXT date columns.
CREATE TABLE user_next (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'VISITOR',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at INTEGER,
  CONSTRAINT user_email_verified_check CHECK (email_verified IN (0, 1)),
  CONSTRAINT user_role_check CHECK (role IN ('VISITOR', 'OWNER'))
)
STRICT;

-- 2. Copy user rows, converting epoch milliseconds to ISO text.
INSERT INTO user_next
  (
    id,
    name,
    email,
    email_verified,
    image,
    role,
    created_at,
    updated_at,
    last_seen_at
  )
SELECT
  id,
  name,
  email,
  email_verified,
  image,
  role,
  CASE
    WHEN typeof(created_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      created_at / 1000.0,
      'unixepoch'
    )
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      updated_at / 1000.0,
      'unixepoch'
    )
    ELSE updated_at
  END,
  last_seen_at
FROM user;

-- 3. New child tables. Their foreign keys target user_next; SQLite rewrites the
-- REFERENCES clause when user_next is renamed to user in step 7.
CREATE TABLE account_next (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  scope TEXT,
  password TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT account_user_id_fk
    FOREIGN KEY (user_id) REFERENCES user_next (id)
      ON DELETE CASCADE
)
STRICT;

CREATE TABLE session_next (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT session_user_id_fk
    FOREIGN KEY (user_id) REFERENCES user_next (id)
      ON DELETE CASCADE
)
STRICT;

CREATE TABLE verification_next (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)
STRICT;

-- 4. Copy child rows with the same conversion.
INSERT INTO account_next
  (
    id,
    user_id,
    account_id,
    provider_id,
    access_token,
    refresh_token,
    id_token,
    access_token_expires_at,
    refresh_token_expires_at,
    scope,
    password,
    created_at,
    updated_at
  )
SELECT
  id,
  user_id,
  account_id,
  provider_id,
  access_token,
  refresh_token,
  id_token,
  CASE
    WHEN typeof(access_token_expires_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      access_token_expires_at / 1000.0,
      'unixepoch'
    )
    ELSE access_token_expires_at
  END,
  CASE
    WHEN typeof(refresh_token_expires_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      refresh_token_expires_at / 1000.0,
      'unixepoch'
    )
    ELSE refresh_token_expires_at
  END,
  scope,
  password,
  CASE
    WHEN typeof(created_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      created_at / 1000.0,
      'unixepoch'
    )
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      updated_at / 1000.0,
      'unixepoch'
    )
    ELSE updated_at
  END
FROM account;

INSERT INTO session_next
  (
    id,
    user_id,
    token,
    expires_at,
    ip_address,
    user_agent,
    created_at,
    updated_at
  )
SELECT
  id,
  user_id,
  token,
  CASE
    WHEN typeof(expires_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      expires_at / 1000.0,
      'unixepoch'
    )
    ELSE expires_at
  END,
  ip_address,
  user_agent,
  CASE
    WHEN typeof(created_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      created_at / 1000.0,
      'unixepoch'
    )
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      updated_at / 1000.0,
      'unixepoch'
    )
    ELSE updated_at
  END
FROM session;

INSERT INTO verification_next
  (id, identifier, value, expires_at, created_at, updated_at)
SELECT
  id,
  identifier,
  value,
  CASE
    WHEN typeof(expires_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      expires_at / 1000.0,
      'unixepoch'
    )
    ELSE expires_at
  END,
  CASE
    WHEN typeof(created_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      created_at / 1000.0,
      'unixepoch'
    )
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) IN ('integer', 'real') THEN strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      updated_at / 1000.0,
      'unixepoch'
    )
    ELSE updated_at
  END
FROM verification;

-- 5. Drop the old child tables first: they reference user.
DROP TABLE account;

DROP TABLE session;

DROP TABLE verification;

-- 6. Drop the old user table. No remaining row references it.
DROP TABLE user;

-- 7. Rename. user_next goes first so the child REFERENCES clauses are rewritten.
ALTER TABLE user_next
RENAME TO user;

ALTER TABLE account_next
RENAME TO account;

ALTER TABLE session_next
RENAME TO session;

ALTER TABLE verification_next
RENAME TO verification;

-- 8. Rebuild the indexes dropped with the old tables.
CREATE UNIQUE INDEX user_email_uidx ON user (email);

CREATE INDEX account_user_id_idx ON account (user_id);

CREATE UNIQUE INDEX account_provider_account_uidx ON account (
  provider_id,
  account_id
);

CREATE INDEX session_user_id_idx ON session (user_id);

CREATE UNIQUE INDEX session_token_uidx ON session (token);

CREATE INDEX verification_identifier_idx ON verification (identifier);
