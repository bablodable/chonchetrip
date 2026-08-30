import { ensureSchema } from '../../../db/schema'
import { isEditorRequest } from '../../../server/auth'
import { errorJson, json } from '../../../server/http'
import type { CloudflareEnv } from '../../../server/types'

const validDayId = (value: string) => /^[a-z0-9-]{1,64}$/.test(value)

export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ params, env }) => {
  const dayId = String(params.dayId ?? '')
  if (!validDayId(dayId)) return errorJson('Неизвестный день.', 400)
  const object = await env.PHOTOS.get(`trip/${dayId}`)
  if (!object) return errorJson('Фотография ещё не добавлена.', 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
}

export const onRequestPut: PagesFunction<CloudflareEnv> = async ({ request, params, env }) => {
  if (!await isEditorRequest(request, env)) return errorJson('Только Юльчона может добавлять фотографии.', 403)
  const dayId = String(params.dayId ?? '')
  if (!validDayId(dayId)) return errorJson('Неизвестный день.', 400)
  const contentType = request.headers.get('Content-Type')?.split(';')[0] ?? ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return errorJson('Нужна фотография.', 415)
  const declaredSize = Number(request.headers.get('Content-Length') ?? 0)
  if (declaredSize > 2_000_000) return errorJson('Фотография слишком большая.', 413)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > 2_000_000) return errorJson('Фотография слишком большая.', 413)

  const objectKey = `trip/${dayId}`
  const updatedAt = new Date().toISOString()
  await env.PHOTOS.put(objectKey, bytes, { httpMetadata: { contentType } })
  await ensureSchema(env.DB)
  await env.DB.prepare(`
    INSERT INTO trip_photos (day_id, object_key, content_type, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(day_id) DO UPDATE SET
      object_key = excluded.object_key,
      content_type = excluded.content_type,
      updated_at = excluded.updated_at
  `).bind(dayId, objectKey, contentType, updatedAt).run()

  return json({ saved: true, url: `/api/photos/${encodeURIComponent(dayId)}?v=${encodeURIComponent(updatedAt)}` })
}
