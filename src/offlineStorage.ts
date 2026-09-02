const DATABASE_NAME = 'chonchetrip-offline-v1'
const DATABASE_VERSION = 1
const PHOTO_STORE = 'pending-photos'

type PendingPhoto = {
  dayId: string
  dataUrl: string
  savedAt: number
}

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Offline photo storage is unavailable.'))
    return
  }

  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(PHOTO_STORE)) {
      database.createObjectStore(PHOTO_STORE, { keyPath: 'dayId' })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Could not open offline photo storage.'))
})

const runRequest = async <T, R>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<R>,
  readResult: (result: R) => T,
) => {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, mode)
    const store = transaction.objectStore(PHOTO_STORE)
    let request: IDBRequest<R>
    try {
      request = operation(store)
    } catch (error) {
      database.close()
      reject(error)
      return
    }
    let result: T
    request.onsuccess = () => { result = readResult(request.result) }
    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }
    const fail = () => {
      database.close()
      reject(transaction.error ?? request.error ?? new Error('Offline photo storage failed.'))
    }
    transaction.onerror = fail
    transaction.onabort = fail
  })
}

export const savePendingPhoto = (dayId: string, dataUrl: string) => runRequest<void, IDBValidKey>(
  'readwrite',
  (store) => store.put({ dayId, dataUrl, savedAt: Date.now() } satisfies PendingPhoto),
  () => undefined,
)

export const loadPendingPhotos = () => runRequest<Record<string, string>, PendingPhoto[]>(
  'readonly',
  (store) => store.getAll() as IDBRequest<PendingPhoto[]>,
  (photos) => photos.reduce<Record<string, string>>((result, photo) => {
    if (photo.dayId && photo.dataUrl.startsWith('data:image/')) result[photo.dayId] = photo.dataUrl
    return result
  }, {}),
)

export const removePendingPhoto = (dayId: string) => runRequest<void, undefined>(
  'readwrite',
  (store) => store.delete(dayId),
  () => undefined,
)
