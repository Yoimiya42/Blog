-- v1 content tables under the field contract in PRD section 5.1.
-- Timestamps are application-managed epoch milliseconds, like
-- user.last_seen_at. Enum values are TEXT guarded by CHECK constraints.
CREATE TABLE post (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  -- Versioned TipTap JSON. The application validates the document shape;
  -- the database only rejects text that is not JSON.
  content TEXT NOT NULL,
  content_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  CONSTRAINT post_slug_check CHECK (length(slug) > 0),
  CONSTRAINT post_title_check CHECK (length(title) > 0),
  CONSTRAINT post_content_check CHECK (json_valid(content)),
  CONSTRAINT post_content_schema_version_check
    CHECK (content_schema_version >= 1),
  CONSTRAINT post_status_check CHECK (status IN ('DRAFT', 'PUBLISHED')),
  CONSTRAINT post_published_at_check
    CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
)
STRICT;

-- A soft-deleted post releases its slug for reuse.
CREATE UNIQUE INDEX post_slug_uidx ON post (slug)
WHERE deleted_at IS NULL;

-- Lookup table: no timestamps and no soft delete. See PRD section 5.1.
CREATE TABLE tag (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  CONSTRAINT tag_slug_check CHECK (length(slug) > 0),
  CONSTRAINT tag_name_check CHECK (length(name) > 0)
)
STRICT;

CREATE UNIQUE INDEX tag_slug_uidx ON tag (slug);

CREATE TABLE post_tag (
  post_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  CONSTRAINT post_tag_pk PRIMARY KEY (post_id, tag_id),
  CONSTRAINT post_tag_post_id_fk
    FOREIGN KEY (post_id) REFERENCES post (id)
      ON DELETE CASCADE,
  CONSTRAINT post_tag_tag_id_fk
    FOREIGN KEY (tag_id) REFERENCES tag (id)
      ON DELETE CASCADE
)
STRICT;

-- The primary key covers lookups by post; the tag archive reads by tag.
CREATE INDEX post_tag_tag_id_idx ON post_tag (tag_id);
