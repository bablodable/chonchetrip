import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { transitMaps } from '../src/transitMaps.ts'
import { tripDays } from '../src/tripData.ts'

const errors = []
const allowedHosts = new Map([
  ['osaka', 'subway.osakametro.co.jp'],
  ['tokyo', 'www.gotokyo.org'],
])
const expectedHomeCodes = {
  osaka: {
    Nagahoribashi: ['K16', 'N16'],
    Shinsaibashi: ['M19'],
  },
  tokyo: {
    Daimon: ['A09', 'E20'],
    Hamamatsucho: ['JY28', 'JK23'],
  },
}
const tripText = JSON.stringify(tripDays)

if (transitMaps.length !== 2) errors.push(`Ожидались две карты метро, найдено: ${transitMaps.length}`)

const mapIds = new Set()
for (const metroMap of transitMaps) {
  if (mapIds.has(metroMap.id)) errors.push(`Повторяется карта ${metroMap.id}`)
  mapIds.add(metroMap.id)

  let url
  try {
    url = new URL(metroMap.sourceUrl)
  } catch {
    errors.push(`${metroMap.city}: некорректная ссылка ${metroMap.sourceUrl}`)
    continue
  }

  if (url.protocol !== 'https:') errors.push(`${metroMap.city}: ссылка должна использовать HTTPS`)
  if (url.hostname !== allowedHosts.get(metroMap.id)) errors.push(`${metroMap.city}: ссылка ведёт не на официальный домен`)

  try {
    const filePath = resolve(import.meta.dirname, '..', 'public', metroMap.mapImage.slice(1))
    const file = await stat(filePath)
    if (file.size < 100_000) errors.push(`${metroMap.city}: изображение карты подозрительно мало`)
    const header = await readFile(filePath)
    if (header.subarray(0, 4).toString() !== 'RIFF') errors.push(`${metroMap.city}: локальное изображение повреждено`)
  } catch {
    errors.push(`${metroMap.city}: не найден локальный файл карты ${metroMap.mapImage}`)
  }

  const lineCodes = new Set()
  for (const line of metroMap.lines) {
    if (lineCodes.has(line.code)) errors.push(`${metroMap.city}: повторяется код линии ${line.code}`)
    lineCodes.add(line.code)
    if (!tripText.includes(line.tripNeedle)) errors.push(`${metroMap.city}: линия ${line.name} не найдена в маршруте`)
  }

  const expectedStops = expectedHomeCodes[metroMap.id]
  for (const stop of metroMap.homeStops) {
    if (!tripText.includes(stop.name)) errors.push(`${metroMap.city}: домашняя станция ${stop.name} не найдена в маршруте`)
    const expectedCodes = expectedStops[stop.name]
    const actualCodes = stop.lines.map((line) => line.code)
    if (!expectedCodes || expectedCodes.join(',') !== actualCodes.join(',')) {
      errors.push(`${metroMap.city}: неверные коды у станции ${stop.name}: ${actualCodes.join(', ')}`)
    }
  }
}

if (errors.length > 0) {
  errors.forEach((message) => console.error(`✗ ${message}`))
  process.exitCode = 1
} else {
  const lineCount = transitMaps.reduce((total, metroMap) => total + metroMap.lines.length, 0)
  const stopCount = transitMaps.reduce((total, metroMap) => total + metroMap.homeStops.length, 0)
  console.log(`Карты метро проверены: ${transitMaps.length} города, ${stopCount} станции у жилья, ${lineCount} линий из маршрута.`)
}
