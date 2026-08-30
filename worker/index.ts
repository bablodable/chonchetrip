import { onRequestGet as getPhoto, onRequestPut as putPhoto } from '../functions/api/photos/[dayId]'
import { onRequestGet as getProgress, onRequestPut as putProgress } from '../functions/api/progress'
import { onRequestGet as getSession, onRequestPost as postSession } from '../functions/api/session'
import { errorJson } from '../server/http'
import type { CloudflareEnv } from '../server/types'

type WorkerEnv = CloudflareEnv & {
  ASSETS: Fetcher
}

const callPageHandler = <T extends (context: never) => Response | Promise<Response>>(
  handler: T,
  request: Request,
  env: WorkerEnv,
  params: Record<string, string> = {},
) => handler({ request, env, params } as never)

const methodNotAllowed = (allowed: string[]) => errorJson('Метод не поддерживается.', 405, {
  headers: { Allow: allowed.join(', ') },
})

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api/session') {
      if (request.method === 'GET') return callPageHandler(getSession, request, env)
      if (request.method === 'POST') return callPageHandler(postSession, request, env)
      return methodNotAllowed(['GET', 'POST'])
    }

    if (pathname === '/api/progress') {
      if (request.method === 'GET') return callPageHandler(getProgress, request, env)
      if (request.method === 'PUT') return callPageHandler(putProgress, request, env)
      return methodNotAllowed(['GET', 'PUT'])
    }

    const photoMatch = pathname.match(/^\/api\/photos\/([^/]+)$/)
    if (photoMatch) {
      const params = { dayId: photoMatch[1] }
      if (request.method === 'GET') return callPageHandler(getPhoto, request, env, params)
      if (request.method === 'PUT') return callPageHandler(putPhoto, request, env, params)
      return methodNotAllowed(['GET', 'PUT'])
    }

    if (pathname.startsWith('/api/')) return errorJson('Неизвестный API-адрес.', 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<WorkerEnv>
