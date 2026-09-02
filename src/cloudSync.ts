export type AccessMode = 'viewer' | 'editor'

export const ACCESS_MODE_KEY = 'chonchetrip-access-mode-v1'

export class CloudUnavailableError extends Error {
  constructor() {
    super('Cloud sync is unavailable')
  }
}

export class CloudSessionExpiredError extends Error {
  constructor() {
    super('Cloud editor session has expired')
  }
}

export const shouldKeepLocalProgress = (
  localSnapshot: string,
  lastCloudSnapshot: string,
  emptySnapshot: string,
  explicitlyPending: boolean,
) => explicitlyPending
  || (lastCloudSnapshot !== '' && localSnapshot !== lastCloudSnapshot)
  || (lastCloudSnapshot === '' && localSnapshot !== emptySnapshot)

const fetchWithTimeout = async (url: string, init: RequestInit | undefined, timeout: number) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

const jsonRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let response: Response
  try {
    response = await fetchWithTimeout(url, { credentials: 'same-origin', ...init }, 12_000)
  } catch {
    throw new CloudUnavailableError()
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) throw new CloudUnavailableError()
  const body = await response.json() as T & { error?: string }
  if (response.status === 401 || response.status === 403) throw new CloudSessionExpiredError()
  if (!response.ok) throw new Error(body.error ?? 'Cloud request failed')
  return body
}

export const loadAccessMode = (): AccessMode | null => {
  try {
    const value = localStorage.getItem(ACCESS_MODE_KEY)
    return value === 'viewer' || value === 'editor' ? value : null
  } catch {
    return null
  }
}

export const rememberAccessMode = (mode: AccessMode) => {
  try {
    localStorage.setItem(ACCESS_MODE_KEY, mode)
  } catch {
    // The current session can still continue when Safari blocks storage.
  }
}

export const forgetAccessMode = () => {
  try {
    localStorage.removeItem(ACCESS_MODE_KEY)
  } catch {
    // There may be nothing to remove when storage access is unavailable.
  }
}

export const checkEditorSession = () => jsonRequest<{ editor: boolean }>('/api/session')

export const startEditorSession = (answer: string) => jsonRequest<{ editor: boolean }>('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answer }),
})

export const loadSharedProgress = () => jsonRequest<{ progress: unknown | null; revision: number; updatedAt: string | null }>('/api/progress')

export const saveSharedProgress = (progress: unknown) => jsonRequest<{ saved: boolean; revision: number; updatedAt: string }>('/api/progress', {
  method: 'PUT',
  keepalive: true,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ progress }),
})

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

export const uploadSharedPhoto = async (dayId: string, dataUrl: string) => {
  const photo = await dataUrlToBlob(dataUrl)
  let response: Response
  try {
    response = await fetchWithTimeout(`/api/photos/${encodeURIComponent(dayId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      body: photo,
    }, 45_000)
  } catch {
    throw new CloudUnavailableError()
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) throw new CloudUnavailableError()
  const body = await response.json() as { saved?: boolean; url?: string; error?: string }
  if (response.status === 401 || response.status === 403) throw new CloudSessionExpiredError()
  if (!response.ok || !body.url) throw new Error(body.error ?? 'Photo upload failed')
  return body.url
}
