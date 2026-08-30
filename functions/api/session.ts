import { answerIsCorrect, createEditorSession, isEditorRequest } from '../../server/auth'
import { errorJson, json } from '../../server/http'
import type { CloudflareEnv } from '../../server/types'

export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ request, env }) => {
  return json({ editor: await isEditorRequest(request, env) })
}

export const onRequestPost: PagesFunction<CloudflareEnv> = async ({ request, env }) => {
  let body: { answer?: unknown }
  try {
    body = await request.json()
  } catch {
    return errorJson('Нужен ответ Кицу.', 400)
  }

  if (!answerIsCorrect(body.answer, env)) return errorJson('Кицу не узнал ответ.', 401)
  const cookie = await createEditorSession(request, env)
  return json({ editor: true }, { headers: { 'Set-Cookie': cookie } })
}
