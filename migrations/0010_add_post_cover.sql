-- Optional list cover under FR-BLOG-14. NULL means no cover. Media rows are
-- soft-deleted, so the reference stays valid; a deleted image no longer
-- resolves and the post renders without a cover.
ALTER TABLE post ADD COLUMN cover_id TEXT REFERENCES media (id);
