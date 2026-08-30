import { ensureSchema } from '../../db/schema'
import { isEditorRequest } from '../../server/auth'
import { errorJson, json } from '../../server/http'
import { sanitizeProgress } from '../../server/progress'
import type { CloudflareEnv } from '../../server/types'

type StateRow = { progress_json: string; revision: number; updated_at: string }
type PhotoRow = { day_id: string; updated_at: string }

export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env }) => {
  await ensureSchema(env.DB)
  const state = await env.DB.prepare(
    "SELECT progress_json, revision, updated_at FROM trip_state WHERE id = 'shared'",
  ).first<StateRow>()
  const photoRows = await env.DB.prepare(
    'SELECT day_id, updated_at FROM trip_photos ORDER BY day_id',
  ).all<PhotoRow>()

  if (!state) return json({ progress: null, revision: 0, updatedAt: null })

  let stored: unknown
  try {
    stored = JSON.parse(state.progress_json)
  } catch {
    return errorJson('Облачный дневник повреждён.', 500)
  }
  const progress = sanitizeProgress(stored)
  if (!progress) return errorJson('Облачный дневник повреждён.', 500)
  const photos = Object.fromEntries(photoRows.results.map((photo) => [
    photo.day_id,
    `/api/photos/${encodeURIComponent(photo.day_id)}?v=${encodeURIComponent(photo.updated_at)}`,
  ]))

  return json({ progress: { ...progress, photos }, revision: state.revision, updatedAt: state.updated_at })
}

export const onRequestPut: PagesFunction<CloudflareEnv> = async ({ request, env }) => {
  if (!await isEditorRequest(request, env)) return errorJson('Только Юльчона может менять дневник.', 403)
  if (Number(request.headers.get('Content-Length') ?? 0) > 250_000) return errorJson('Состояние слишком большое.', 413)

  let body: { progress?: unknown }
  try {
    body = await request.json()
  } catch {
    return errorJson('Не удалось прочитать дневник.', 400)
  }
  const progress = sanitizeProgress(body.progress)
  if (!progress) return errorJson('Некорректное состояние дневника.', 400)

  await ensureSchema(env.DB)
  const updatedAt = new Date().toISOString()
  await env.DB.prepare(`
    INSERT INTO trip_state (id, progress_json, revision, updated_at)
    VALUES ('shared', ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      progress_json = excluded.progress_json,
      revision = trip_state.revision + 1,
      updated_at = excluded.updated_at
  `).bind(JSON.stringify(progress), updatedAt).run()
  const state = await env.DB.prepare(
    "SELECT revision FROM trip_state WHERE id = 'shared'",
  ).first<{ revision: number }>()

  return json({ saved: true, revision: state?.revision ?? 1, updatedAt })
}
