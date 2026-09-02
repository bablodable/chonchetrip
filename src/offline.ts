export type OfflinePackStatus = 'checking' | 'available' | 'downloading' | 'ready' | 'unsupported' | 'error'

type OfflineWorkerMessage = {
  type: 'OFFLINE_STATUS' | 'OFFLINE_PROGRESS' | 'OFFLINE_READY' | 'OFFLINE_ERROR'
  ready?: boolean
  completed?: number
  total?: number
  message?: string
}

const serviceWorkersAvailable = () => 'serviceWorker' in navigator
  && (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null

const offlineRegistration = () => {
  if (!serviceWorkersAvailable()) return Promise.reject(new Error('Offline mode is not supported in this browser.'))
  registrationPromise ??= navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
  return registrationPromise
}

const activeWorker = async () => {
  const registration = await offlineRegistration()
  const readyRegistration = registration.active ? registration : await navigator.serviceWorker.ready
  const worker = readyRegistration.active ?? readyRegistration.waiting
  if (!worker) throw new Error('Offline worker is not ready yet.')
  return worker
}

const askWorker = async (
  type: 'OFFLINE_STATUS' | 'DOWNLOAD_OFFLINE',
  onProgress?: (completed: number, total: number) => void,
) => {
  const worker = await activeWorker()
  return new Promise<OfflineWorkerMessage>((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Offline worker did not answer.'))
    }, 120_000)

    channel.port1.onmessage = (event: MessageEvent<OfflineWorkerMessage>) => {
      const message = event.data
      if (message.type === 'OFFLINE_PROGRESS') {
        onProgress?.(message.completed ?? 0, message.total ?? 0)
        return
      }

      window.clearTimeout(timer)
      channel.port1.close()
      if (message.type === 'OFFLINE_ERROR') reject(new Error(message.message ?? 'Could not download the trip.'))
      else resolve(message)
    }

    worker.postMessage({ type }, [channel.port2])
  })
}

export const registerOfflineWorker = async () => {
  if (!serviceWorkersAvailable() || import.meta.env.DEV) return false
  await offlineRegistration()
  return true
}

export const requestPersistentOfflineStorage = async () => {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted?.()) return true
    return navigator.storage.persist()
  } catch {
    return false
  }
}

export const readOfflinePackStatus = async () => {
  if (!serviceWorkersAvailable() || import.meta.env.DEV) return { supported: false, ready: false, completed: 0, total: 0 }
  const message = await askWorker('OFFLINE_STATUS')
  return {
    supported: true,
    ready: Boolean(message.ready),
    completed: message.completed ?? 0,
    total: message.total ?? 0,
  }
}

export const downloadOfflinePack = async (onProgress: (completed: number, total: number) => void) => {
  const message = await askWorker('DOWNLOAD_OFFLINE', onProgress)
  return { completed: message.completed ?? 0, total: message.total ?? 0 }
}
