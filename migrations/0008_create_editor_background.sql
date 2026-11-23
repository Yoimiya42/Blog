-- Editor background preference under FR-ADMIN-26 and ADR-0031. One row per
-- user. media_id is null for no background; a soft-deleted media row stays
-- referenced and simply no longer resolves. opacity is a visibility tier.
CREATE TABLE editor_background (
  user_id TEXT PRIMARY KEY NOT NULL,
  media_id TEXT,
  opacity INTEGER NOT NULL DEFAULT 50,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CONSTRAINT editor_background_opacity_check
    CHECK (opacity IN (0, 25, 50, 75, 100)),
  CONSTRAINT editor_background_user_id_fk
    FOREIGN KEY (user_id) REFERENCES user (id)
      ON DELETE CASCADE,
  CONSTRAINT editor_background_media_id_fk
    FOREIGN KEY (media_id) REFERENCES media (id)
)
STRICT;
