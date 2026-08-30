export const json = (value: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(value), { ...init, headers })
}

export const errorJson = (message: string, status: number) => json({ error: message }, { status })
