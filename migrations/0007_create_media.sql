-- Uploaded images under ADR-0021. The R2 object at storage_key is the
-- GPS-clean original; public URLs are derived from id and storage_key.
-- gps_latitude and gps_longitude are owner-only and never rendered publicly.
CREATE TABLE media (
  id TEXT PRIMARY KEY NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  -- Displayed dimensions, after EXIF orientation.
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  -- Empty marks a decorative image.
  alt TEXT NOT NULL DEFAULT '',
  gps_latitude REAL,
  gps_longitude REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  CONSTRAINT media_mime_type_check
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT media_dimensions_check CHECK (width > 0 AND height > 0),
  CONSTRAINT media_size_bytes_check CHECK (size_bytes > 0),
  CONSTRAINT media_gps_pair_check
    CHECK ((gps_latitude IS NULL) = (gps_longitude IS NULL)),
  CONSTRAINT media_gps_range_check
    CHECK (
      gps_latitude IS NULL
      OR (
        gps_latitude BETWEEN -90 AND 90
        AND gps_longitude BETWEEN -180 AND 180
      )
    )
)
STRICT;

CREATE UNIQUE INDEX media_storage_key_uidx ON media (storage_key);
