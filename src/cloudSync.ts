export type AccessMode = 'viewer' | 'editor'

export const ACCESS_MODE_KEY = 'chonchetrip-access-mode-v1'

export class CloudUnavailableError extends Error {
  constructor() {
    super('Cloud sync is unavailable')
  }
}

const jsonRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let response: Response
  try {
    response = await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new CloudUnavailableError()
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) throw new CloudUnavailableError()
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? 'Cloud request failed')
  return body
}

export const loadAccessMode = (): AccessMode | null => {
  const value = localStorage.getItem(ACCESS_MODE_KEY)
  return value === 'viewer' || value === 'editor' ? value : null
}

export const rememberAccessMode = (mode: AccessMode) => localStorage.setItem(ACCESS_MODE_KEY, mode)

export const forgetAccessMode = () => localStorage.removeItem(ACCESS_MODE_KEY)

export const checkEditorSession = () => jsonRequest<{ editor: boolean }>('/api/session')

export const startEditorSession = (answer: string) => jsonRequest<{ editor: boolean }>('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answer }),
})

export const loadSharedProgress = () => jsonRequest<{ progress: unknown | null; revision: number; updatedAt: string | null }>('/api/progress')

export const saveSharedProgress = (progress: unknown) => jsonRequest<{ saved: boolean; revision: number; updatedAt: string }>('/api/progress', {
  method: 'PUT',
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
    response = await fetch(`/api/photos/${encodeURIComponent(dayId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': photo.type || 'image/jpeg' },
      body: photo,
    })
  } catch {
    throw new CloudUnavailableError()
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) throw new CloudUnavailableError()
  const body = await response.json() as { saved?: boolean; url?: string; error?: string }
  if (!response.ok || !body.url) throw new Error(body.error ?? 'Photo upload failed')
  return body.url
}
