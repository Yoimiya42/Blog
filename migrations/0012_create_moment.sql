-- Moments under FR-MOMENT and ADR-0036. A moment has no status: saving
-- publishes. created_at is the displayed date; updated_at is the optimistic
-- concurrency token, as for post. Likes and comments reference moment.id
-- through the polymorphic FR-SOCIAL tables, so no interaction columns exist.
CREATE TABLE moment (
  id TEXT PRIMARY KEY NOT NULL,
  -- Plain text. Empty only when the moment has images; the service checks
  -- that rule because it spans two tables.
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  CONSTRAINT moment_body_length_check CHECK (length(body) <= 2000)
)
STRICT;

-- The feed reads live moments newest first.
CREATE INDEX moment_created_at_idx ON moment (created_at DESC, id DESC)
WHERE deleted_at IS NULL;

-- Ordered images of a moment. Media rows are soft-deleted, so the foreign
-- key always resolves; a deleted image is left out at read time.
CREATE TABLE moment_media (
  moment_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  CONSTRAINT moment_media_pk PRIMARY KEY (moment_id, position),
  CONSTRAINT moment_media_moment_id_fk
    FOREIGN KEY (moment_id) REFERENCES moment (id)
      ON DELETE CASCADE,
  CONSTRAINT moment_media_media_id_fk
    FOREIGN KEY (media_id) REFERENCES media (id),
  CONSTRAINT moment_media_position_check CHECK (position BETWEEN 0 AND 8)
)
STRICT;

CREATE UNIQUE INDEX moment_media_moment_media_uidx ON moment_media (
  moment_id,
  media_id
);

-- The media reference scan reads by image (ADR-0025).
CREATE INDEX moment_media_media_id_idx ON moment_media (media_id);
