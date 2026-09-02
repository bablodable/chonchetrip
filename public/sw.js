/* Chonchetrip offline worker. The build writes /offline-assets.json. */
const BUILD_VERSION = '__CHONCHETRIP_BUILD_VERSION__'
const CACHE_PREFIX = 'chonchetrip-'
const MANIFEST_CACHE = `${CACHE_PREFIX}manifest`
const TILE_CACHE = `${CACHE_PREFIX}map-tiles`
const MAX_TILE_ENTRIES = 180

let manifestPromise

const loadManifest = async (refresh = false) => {
  if (manifestPromise && !refresh) return manifestPromise
  manifestPromise = (async () => {
    const manifestCache = await caches.open(MANIFEST_CACHE)
    try {
      const response = await fetch('/offline-assets.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('Offline manifest is unavailable.')
      const manifest = await response.clone().json()
      if (manifest.version !== BUILD_VERSION) throw new Error('Offline manifest version does not match the application.')
      await manifestCache.put('/offline-assets.json', response.clone())
      return manifest
    } catch (error) {
      const cached = await manifestCache.match('/offline-assets.json')
      if (!cached) throw error
      const manifest = await cached.json()
      if (manifest.version !== BUILD_VERSION) throw error
      return manifest
    }
  })()
  return manifestPromise
}

const cacheNames = (manifest) => ({
  core: `${CACHE_PREFIX}core-${manifest.version}`,
  trip: `${CACHE_PREFIX}trip-${manifest.version}`,
  runtime: `${CACHE_PREFIX}runtime-${manifest.version}`,
})

const cacheResource = async (cache, url) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok && response.type !== 'opaque') throw new Error(`Could not cache ${url}`)
  await cache.put(url, response)
}

const findCached = async (request) => {
  const direct = await caches.match(request)
  if (direct) return direct
  const url = new URL(typeof request === 'string' ? request : request.url, self.location.origin)
  if (url.origin === self.location.origin && url.search) {
    const withoutSearch = await caches.match(url.pathname)
    if (withoutSearch) return withoutSearch
  }
  if (request.mode === 'navigate') return caches.match('/index.html')
  return undefined
}

const trimTiles = async () => {
  const cache = await caches.open(TILE_CACHE)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILE_ENTRIES)).map((key) => cache.delete(key)))
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const manifest = await loadManifest(true)
    const cache = await caches.open(cacheNames(manifest).core)
    await cache.addAll(manifest.core)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const manifest = await loadManifest()
    const current = new Set([...Object.values(cacheNames(manifest)), MANIFEST_CACHE, TILE_CACHE])
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && !current.has(name)).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        const manifest = await loadManifest()
        const cache = await caches.open(cacheNames(manifest).runtime)
        await cache.put(request, response.clone())
        return response
      } catch {
        return (await findCached(request)) ?? Response.error()
      }
    })())
    return
  }

  const isMapTile = url.hostname.endsWith('.tile.openstreetmap.org')
  const isLocal = url.origin === self.location.origin
  if (!isLocal && !isMapTile) return

  event.respondWith((async () => {
    const cached = await findCached(request)
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok || response.type === 'opaque') {
        if (isMapTile) {
          const cache = await caches.open(TILE_CACHE)
          await cache.put(request, response.clone())
          await trimTiles()
        } else {
          const manifest = await loadManifest()
          const cache = await caches.open(cacheNames(manifest).runtime)
          await cache.put(request, response.clone())
        }
      }
      return response
    } catch {
      return (await findCached(request)) ?? Response.error()
    }
  })())
})

self.addEventListener('message', (event) => {
  const port = event.ports[0]
  if (!port) return

  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil((async () => {
      try {
        const manifest = await loadManifest()
        const names = cacheNames(manifest)
        const cache = await caches.open(names.trip)
        const urls = [...manifest.trip, ...manifest.external]
        const matches = await Promise.all(urls.map((url) => cache.match(url)))
        const completed = matches.filter(Boolean).length
        port.postMessage({ type: 'OFFLINE_STATUS', ready: completed === urls.length, completed, total: urls.length })
      } catch (error) {
        port.postMessage({ type: 'OFFLINE_ERROR', message: error instanceof Error ? error.message : 'Offline status failed.' })
      }
    })())
    return
  }

  if (event.data?.type === 'DOWNLOAD_OFFLINE') {
    event.waitUntil((async () => {
      try {
        const manifest = await loadManifest(true)
        const cache = await caches.open(cacheNames(manifest).trip)
        const urls = [...manifest.trip, ...manifest.external]
        let completed = 0
        for (const url of urls) {
          if (!(await cache.match(url))) await cacheResource(cache, url)
          completed += 1
          port.postMessage({ type: 'OFFLINE_PROGRESS', completed, total: urls.length })
        }
        port.postMessage({ type: 'OFFLINE_READY', ready: true, completed, total: urls.length })
      } catch (error) {
        port.postMessage({ type: 'OFFLINE_ERROR', message: error instanceof Error ? error.message : 'Offline download failed.' })
      }
    })())
  }
})
