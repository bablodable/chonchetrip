export const createTripStateTableSql = `
  CREATE TABLE IF NOT EXISTS trip_state (
    id TEXT PRIMARY KEY CHECK (id = 'shared'),
    progress_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )
`

export const createTripPhotosTableSql = `
  CREATE TABLE IF NOT EXISTS trip_photos (
    day_id TEXT PRIMARY KEY,
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`

export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(createTripStateTableSql),
    db.prepare(createTripPhotosTableSql),
  ])
}
