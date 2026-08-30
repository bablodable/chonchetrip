CREATE TABLE IF NOT EXISTS trip_photo_data (
  day_id TEXT PRIMARY KEY,
  image BLOB NOT NULL,
  content_type TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
