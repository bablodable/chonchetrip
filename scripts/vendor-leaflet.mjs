import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const leafletRoot = resolve(projectRoot, 'node_modules', 'leaflet')
const targetRoot = resolve(projectRoot, 'public', 'japan_daily_maps_mobile', 'vendor', 'leaflet')
const files = [
  ['dist/leaflet.css', 'leaflet.css'],
  ['dist/leaflet.js', 'leaflet.js'],
  ['dist/images/layers-2x.png', 'images/layers-2x.png'],
  ['dist/images/layers.png', 'images/layers.png'],
  ['dist/images/marker-icon-2x.png', 'images/marker-icon-2x.png'],
  ['dist/images/marker-icon.png', 'images/marker-icon.png'],
  ['dist/images/marker-shadow.png', 'images/marker-shadow.png'],
  ['LICENSE', 'LICENSE'],
]

await mkdir(resolve(targetRoot, 'images'), { recursive: true })
await Promise.all(files.map(([source, target]) => copyFile(resolve(leafletRoot, source), resolve(targetRoot, target))))

const mapRoot = resolve(projectRoot, 'public', 'japan_daily_maps_mobile')
const mapFiles = (await readdir(mapRoot)).filter((file) => /^2026-.+\.html$/.test(file))
await Promise.all(mapFiles.map(async (file) => {
  const path = resolve(mapRoot, file)
  const source = await readFile(path, 'utf8')
  const updated = source
    .replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', '/japan_daily_maps_mobile/vendor/leaflet/leaflet.css')
    .replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', '/japan_daily_maps_mobile/vendor/leaflet/leaflet.js')
  await writeFile(path, updated)
}))

console.log(`Leaflet 1.9.4 сохранён локально: ${files.length} файлов, обновлено карт: ${mapFiles.length}.`)
