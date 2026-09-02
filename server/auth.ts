import type { CloudflareEnv } from './types'

const COOKIE_NAME = 'chonchetrip_editor'
const SESSION_SECONDS = 60 * 60 * 24 * 370
const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

const sessionSecret = (env: CloudflareEnv) => env.SESSION_SECRET?.trim() || null

const readCookie = (request: Request) => {
  const cookies = request.headers.get('Cookie') ?? ''
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE_NAME) return value.join('=')
  }
  return null
}

export const createEditorSession = async (request: Request, env: CloudflareEnv) => {
  const secret = sessionSecret(env)
  if (!secret) throw new Error('SESSION_SECRET is not configured.')

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = String(expires)
  const token = `${payload}.${await sign(payload, secret)}`
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`
}

export const isEditorRequest = async (request: Request, env: CloudflareEnv) => {
  const secret = sessionSecret(env)
  if (!secret) return false

  const token = readCookie(request)
  if (!token) return false
  const [expiresValue, signature] = token.split('.')
  const expires = Number(expiresValue)
  if (!expiresValue || !signature || !Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false
  const expected = await sign(expiresValue, secret)
  return signature === expected
}

export const answerIsCorrect = (answer: unknown, env: CloudflareEnv) => {
  if (typeof answer !== 'string') return false
  const expected = env.EDITOR_CODE?.trim()
  if (!expected) return false
  return answer.trim().toLocaleLowerCase('ru-RU') === expected.trim().toLocaleLowerCase('ru-RU')
}
