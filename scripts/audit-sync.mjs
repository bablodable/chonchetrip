import assert from 'node:assert/strict'
import {
  CloudSessionExpiredError,
  CloudUnavailableError,
  saveSharedProgress,
  shouldKeepLocalProgress,
} from '../src/cloudSync.ts'

const empty = '{"checked":[]}'
const remote = '{"checked":["station"]}'
const local = '{"checked":["station","train"]}'

assert.equal(shouldKeepLocalProgress(remote, remote, empty, false), false, 'A clean local snapshot should accept newer cloud state.')
assert.equal(shouldKeepLocalProgress(local, remote, empty, false), true, 'A local change based on a known cloud snapshot must win.')
assert.equal(shouldKeepLocalProgress(local, '', empty, false), true, 'First-session offline changes must not be overwritten.')
assert.equal(shouldKeepLocalProgress(empty, '', empty, false), false, 'An untouched fresh install should accept cloud state.')
assert.equal(shouldKeepLocalProgress(remote, remote, empty, true), true, 'The durable pending marker must survive ambiguous snapshots.')

const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
globalThis.window = { setTimeout, clearTimeout }

let savedRequest
globalThis.fetch = async (_url, init) => {
  savedRequest = init
  return new Response(JSON.stringify({ saved: true, revision: 2, updatedAt: '2026-09-30T00:00:00.000Z' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
await saveSharedProgress({ checked: ['station'] })
assert.equal(savedRequest.method, 'PUT')
assert.equal(savedRequest.keepalive, true, 'Small progress writes should survive an immediate iPhone background transition.')
assert.equal(savedRequest.credentials, 'same-origin')

globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Session expired' }), {
  status: 403,
  headers: { 'Content-Type': 'application/json' },
})
await assert.rejects(saveSharedProgress({}), CloudSessionExpiredError)

globalThis.fetch = async () => { throw new TypeError('Network unavailable') }
await assert.rejects(saveSharedProgress({}), CloudUnavailableError)

globalThis.fetch = originalFetch
if (originalWindow === undefined) delete globalThis.window
else globalThis.window = originalWindow

console.log('Очередь синхронизации проверена: локальные изменения защищены, online-запись переживает сворачивание, сеть и истёкшая сессия различаются.')
