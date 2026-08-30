import { ensureSchema } from '../../../db/schema'
import { isEditorRequest } from '../../../server/auth'
import { errorJson, json } from '../../../server/http'
import type { CloudflareEnv } from '../../../server/types'

const validDayId = (value: string) => /^[a-z0-9-]{1,64}$/.test(value)
const MAX_PHOTO_BYTES = 1_900_000

type PhotoRow = {
  image: number[]
  content_type: string
  updated_at: string
}

export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ params, env }) => {
  const dayId = String(params.dayId ?? '')
  if (!validDayId(dayId)) return errorJson('Неизвестный день.', 400)
  await ensureSchema(env.DB)
  const photo = await env.DB.prepare(
    'SELECT image, content_type, updated_at FROM trip_photo_data WHERE day_id = ?',
  ).bind(dayId).first<PhotoRow>()
  if (!photo) return errorJson('Фотография ещё не добавлена.', 404)

  const headers = new Headers({ 'Content-Type': photo.content_type })
  headers.set('ETag', `"${photo.updated_at}"`)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(Uint8Array.from(photo.image), { headers })
}

export const onRequestPut: PagesFunction<CloudflareEnv> = async ({ request, params, env }) => {
  if (!await isEditorRequest(request, env)) return errorJson('Только Юльчона может добавлять фотографии.', 403)
  const dayId = String(params.dayId ?? '')
  if (!validDayId(dayId)) return errorJson('Неизвестный день.', 400)
  const contentType = request.headers.get('Content-Type')?.split(';')[0] ?? ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return errorJson('Нужна фотография.', 415)
  const declaredSize = Number(request.headers.get('Content-Length') ?? 0)
  if (declaredSize > MAX_PHOTO_BYTES) return errorJson('Фотография слишком большая.', 413)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return errorJson('Фотография слишком большая.', 413)

  const updatedAt = new Date().toISOString()
  await ensureSchema(env.DB)
  await env.DB.prepare(`
    INSERT INTO trip_photo_data (day_id, image, content_type, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(day_id) DO UPDATE SET
      image = excluded.image,
      content_type = excluded.content_type,
      updated_at = excluded.updated_at
  `).bind(dayId, bytes, contentType, updatedAt).run()

  return json({ saved: true, url: `/api/photos/${encodeURIComponent(dayId)}?v=${encodeURIComponent(updatedAt)}` })
}
