import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'

const projectRoot = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(projectRoot, 'dist')
const offlineManifest = JSON.parse(await readFile(resolve(outputDirectory, 'offline-assets.json'), 'utf8'))
const webManifest = JSON.parse(await readFile(resolve(outputDirectory, 'manifest.webmanifest'), 'utf8'))
const workerSource = await readFile(resolve(outputDirectory, 'sw.js'), 'utf8')

if (!offlineManifest.version || !Array.isArray(offlineManifest.core) || !Array.isArray(offlineManifest.trip)) {
  throw new Error('Offline manifest has an invalid shape.')
}

const localUrls = [...offlineManifest.core, ...offlineManifest.trip].filter((url) => url !== '/')
const uniqueUrls = new Set(localUrls)
if (uniqueUrls.size !== localUrls.length) throw new Error('Offline manifest contains duplicate URLs.')
if (!offlineManifest.core.includes('/index.html')) throw new Error('Offline core does not include index.html.')
if (!offlineManifest.core.some((url) => /^\/assets\/index-[^/]+\.js$/.test(url))) throw new Error('Offline core does not include the application bundle.')
if (localUrls.some((url) => url.startsWith('/api/'))) throw new Error('API routes must never be cached.')
if (!offlineManifest.trip.includes('/japan_daily_maps_mobile/vendor/leaflet/leaflet.js')) throw new Error('Offline maps do not include local Leaflet runtime.')
for (const transitAsset of [
  '/assets/transit/osaka-metro-map.webp',
  '/assets/transit/tokyo-subway-map.webp',
]) {
  if (!offlineManifest.trip.includes(transitAsset)) throw new Error(`Offline pack does not include ${transitAsset}.`)
}
if (offlineManifest.external.length !== 0) throw new Error('Offline pack must not depend on third-party CDN resources.')

for (const url of localUrls) await stat(resolve(outputDirectory, url.slice(1)))

const expectedMaps = 13
const cachedMaps = offlineManifest.trip.filter((url) => /^\/japan_daily_maps_mobile\/2026-.+\.html$/.test(url)).length
if (cachedMaps !== expectedMaps) throw new Error(`Offline pack contains ${cachedMaps} daily maps instead of ${expectedMaps}.`)
if (!Array.isArray(webManifest.icons) || webManifest.icons.length === 0 || webManifest.display !== 'standalone') {
  throw new Error('Web app manifest is not installable.')
}

new Function(workerSource)
if (workerSource.includes('__CHONCHETRIP_BUILD_VERSION__') || !workerSource.includes(offlineManifest.version)) {
  throw new Error('Service worker was not tied to this build version.')
}

const runWorkerScenario = async () => {
  const origin = 'https://chonchetrip.test'
  let online = true
  const listeners = new Map()
  const stores = new Map()
  const keyFor = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href

  class MemoryCache {
    entries = new Map()

    async addAll(urls) {
      for (const url of urls) {
        const response = await mockFetch(url)
        if (!response.ok) throw new Error(`Could not cache ${url}`)
        await this.put(url, response)
      }
    }

    async put(request, response) {
      this.entries.set(keyFor(request), response.clone())
    }

    async match(request) {
      return this.entries.get(keyFor(request))?.clone()
    }

    async keys() {
      return [...this.entries.keys()].map((url) => new Request(url))
    }

    async delete(request) {
      return this.entries.delete(keyFor(request))
    }
  }

  const cacheStorage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache())
      return stores.get(name)
    },
    async match(request) {
      for (const cache of stores.values()) {
        const response = await cache.match(request)
        if (response) return response
      }
      return undefined
    },
    async keys() {
      return [...stores.keys()]
    },
    async delete(name) {
      return stores.delete(name)
    },
  }

  const mockFetch = async (request) => {
    if (!online) throw new TypeError('Network unavailable')
    const url = new URL(typeof request === 'string' ? request : request.url, origin)
    if (url.pathname === '/offline-assets.json') {
      return new Response(JSON.stringify(offlineManifest), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(url.pathname === '/' || url.pathname === '/index.html' ? '<main>Chonchetrip</main>' : url.href)
  }

  const self = {
    location: { origin },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type, listener) => listeners.set(type, listener),
  }
  vm.runInNewContext(workerSource, {
    self,
    caches: cacheStorage,
    fetch: mockFetch,
    Request,
    Response,
    URL,
    Error,
    TypeError,
    Promise,
    Set,
    Map,
    Object,
  }, { filename: 'dist/sw.js' })

  const lifetimeEvent = () => {
    let lifetime
    return {
      event: { waitUntil: (promise) => { lifetime = promise } },
      done: async () => lifetime,
    }
  }

  const install = lifetimeEvent()
  listeners.get('install')(install.event)
  await install.done()
  const activate = lifetimeEvent()
  listeners.get('activate')(activate.event)
  await activate.done()

  const sendMessage = async (type) => {
    const messages = []
    const dispatched = lifetimeEvent()
    listeners.get('message')({
      ...dispatched.event,
      data: { type },
      ports: [{ postMessage: (message) => messages.push(message) }],
    })
    await dispatched.done()
    return messages
  }

  const before = await sendMessage('OFFLINE_STATUS')
  if (before.at(-1)?.ready) throw new Error('Trip pack must not be ready before the explicit download.')
  const download = await sendMessage('DOWNLOAD_OFFLINE')
  if (download.at(-1)?.type !== 'OFFLINE_READY') throw new Error('Trip pack download did not finish.')
  const after = await sendMessage('OFFLINE_STATUS')
  if (!after.at(-1)?.ready) throw new Error('Trip pack is not reported as ready after download.')

  online = false
  let navigationResponse
  listeners.get('fetch')({
    request: { url: `${origin}/a-day-in-japan`, method: 'GET', mode: 'navigate' },
    respondWith: (promise) => { navigationResponse = promise },
  })
  const response = await navigationResponse
  if (!response?.ok || !(await response.text()).includes('Chonchetrip')) {
    throw new Error('Offline navigation did not return the cached application shell.')
  }

  let mapResponse
  listeners.get('fetch')({
    request: { url: `${origin}/japan_daily_maps_mobile/2026-10-10-ginza-akihabara.html?embed=1&date=10.10`, method: 'GET', mode: 'cors' },
    respondWith: (promise) => { mapResponse = promise },
  })
  if (!(await mapResponse)?.ok) throw new Error('Offline daily map did not ignore progress query parameters.')

  let apiIntercepted = false
  listeners.get('fetch')({
    request: { url: `${origin}/api/progress`, method: 'GET', mode: 'cors' },
    respondWith: () => { apiIntercepted = true },
  })
  if (apiIntercepted) throw new Error('Service worker must not cache or intercept API requests.')
}

await runWorkerScenario()

const bytes = (await Promise.all(localUrls.map(async (url) => (await stat(resolve(outputDirectory, url.slice(1)))).size)))
  .reduce((sum, size) => sum + size, 0)
console.log(`Офлайн-пакет проверен: ${offlineManifest.core.length} базовых ресурсов, ${offlineManifest.trip.length} ресурсов поездки, ${cachedMaps} карт, ${(bytes / 1024 / 1024).toFixed(2)} МБ; установка и запуск без сети работают.`)
