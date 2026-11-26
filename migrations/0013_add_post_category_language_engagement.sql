-- Owner-managed post categories under FR-BLOG-18 and FR-ADMIN-30. A lookup
-- table: no soft delete. Names are unique ignoring case.
CREATE TABLE category (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT category_name_check CHECK (length(name) > 0)
)
STRICT;

CREATE UNIQUE INDEX category_name_uidx ON category (name COLLATE NOCASE);

-- NULL only for a post never published with a category. No ON DELETE
-- action: the service refuses to delete a category in use.
ALTER TABLE post ADD COLUMN category_id TEXT REFERENCES category (id);

-- Content language and translation group under FR-BLOG-22 (ADR-0038). The
-- language list is checked by the application: changing a CHECK on `post`
-- would rebuild the table.
ALTER TABLE post ADD COLUMN language TEXT;

ALTER TABLE post ADD COLUMN translation_of TEXT REFERENCES post (id);

-- One live version per language in a group. The group key is the original's
-- id.
CREATE UNIQUE INDEX post_translation_language_uidx ON post (
  coalesce(translation_of, id),
  language
)
WHERE deleted_at IS NULL AND language IS NOT NULL;

-- View counts under FR-BLOG-19, outside `post` so a view never rewrites the
-- post row or its `updated_at` version token (ADR-0037).
CREATE TABLE post_view (
  post_id TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT post_view_count_check CHECK (count >= 0),
  CONSTRAINT post_view_post_id_fk
    FOREIGN KEY (post_id) REFERENCES post (id)
      ON DELETE CASCADE
)
STRICT;

-- Anonymous likes under FR-BLOG-20. Polymorphic and without a foreign key,
-- so moments can reuse it (FR-MOMENT-08). One row per visitor, target, and
-- kind; counts are derived.
CREATE TABLE reaction (
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT reaction_pk PRIMARY KEY (target_type, target_id, kind, visitor_id),
  CONSTRAINT reaction_target_type_check CHECK (target_type IN ('POST')),
  CONSTRAINT reaction_kind_check CHECK (kind IN ('LIKE')),
  CONSTRAINT reaction_visitor_id_check CHECK (length(visitor_id) > 0)
)
STRICT;
