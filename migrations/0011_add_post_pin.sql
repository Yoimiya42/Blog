-- Pinned posts under FR-BLOG-17. NULL means not pinned; the value is the pin
-- time in epoch milliseconds and orders pinned posts, most recent first. The
-- three-post limit is enforced by the service.
ALTER TABLE post ADD COLUMN pinned_at INTEGER;
