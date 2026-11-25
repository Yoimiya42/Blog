-- Post category under FR-BLOG-18. NULL only for a post never published with
-- one; the service requires a category to publish.
ALTER TABLE post
ADD COLUMN category TEXT CONSTRAINT post_category_check
  CHECK (
    category IS NULL
    OR category IN ('tech', 'economy', 'history', 'prose', 'monologue')
  );

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
