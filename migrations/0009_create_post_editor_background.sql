-- A post's own editor background under FR-ADMIN-26 and ADR-0032. It overrides
-- the owner default in editor_background; deleting the row returns the post
-- to the default. Kept outside post so a change never moves post.updated_at.
CREATE TABLE post_editor_background (
  post_id TEXT PRIMARY KEY NOT NULL,
  media_id TEXT,
  opacity INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CONSTRAINT post_editor_background_opacity_check
    CHECK (opacity IN (0, 25, 50, 75, 100)),
  CONSTRAINT post_editor_background_post_id_fk
    FOREIGN KEY (post_id) REFERENCES post (id)
      ON DELETE CASCADE,
  CONSTRAINT post_editor_background_media_id_fk
    FOREIGN KEY (media_id) REFERENCES media (id)
)
STRICT;
