import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tripDays } from '../src/tripData.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mapDirectory = path.join(projectRoot, 'public', 'japan_daily_maps_mobile')
const errors = []
const warnings = []

const recordError = (message) => errors.push(message)
const recordWarning = (message) => warnings.push(message)

function readJsonConstant(html, name, fileName) {
  const match = html.match(new RegExp(`const ${name} = (\\[[^\\n]+\\]);`))
  if (!match) {
    recordError(`${fileName}: не найден массив ${name}`)
    return []
  }

  try {
    const value = JSON.parse(match[1])
    if (!Array.isArray(value)) throw new Error('ожидался массив')
    return value
  } catch (error) {
    recordError(`${fileName}: массив ${name} не читается (${error.message})`)
    return []
  }
}

function buildRoute(points, segments, fileName) {
  const pointNumbers = new Set(points.map((point) => point.n))
  const entries = []
  const legs = []

  segments.forEach((segment, segmentIndex) => {
    if (!Array.isArray(segment.path) || segment.path.length < 2) {
      recordError(`${fileName}: сегмент ${segmentIndex + 1} должен содержать минимум две точки`)
      return
    }

    if (segmentIndex > 0) {
      const previousEnd = segments[segmentIndex - 1]?.path?.at(-1)
      if (previousEnd !== segment.path[0]) {
        recordError(`${fileName}: разрыв между сегментами ${segmentIndex} и ${segmentIndex + 1}`)
      }
    }

    segment.path.forEach((pointNumber, index) => {
      if (!pointNumbers.has(pointNumber)) {
        recordError(`${fileName}: сегмент ${segmentIndex + 1} ссылается на отсутствующую точку ${pointNumber}`)
        return
      }
      if (index === 0 && entries.at(-1)?.pointNumber === pointNumber) return

      const previous = entries.at(-1)
      if (previous) legs.push({ from: previous.pointNumber, to: pointNumber, type: segment.type })
      entries.push({ pointNumber })
    })
  })

  return { entries, legs }
}

const htmlFiles = new Set((await readdir(mapDirectory)).filter((fileName) => fileName.endsWith('.html') && fileName !== 'index.html'))
const daysWithMaps = tripDays.filter((day) => day.mapFile)
const mapFilesInData = new Set(daysWithMaps.map((day) => day.mapFile))

for (const fileName of mapFilesInData) {
  if (!htmlFiles.has(fileName)) recordError(`${fileName}: файл указан в tripData, но отсутствует`)
}
for (const fileName of htmlFiles) {
  if (!mapFilesInData.has(fileName)) recordWarning(`${fileName}: файл карты не используется в tripData`)
}

const summaries = []

for (const fileName of [...mapFilesInData].sort()) {
  if (!htmlFiles.has(fileName)) continue
  const html = await readFile(path.join(mapDirectory, fileName), 'utf8')
  const points = readJsonConstant(html, 'points', fileName)
  const segments = readJsonConstant(html, 'segments', fileName)
  const pointNumbers = points.map((point) => point.n)
  const uniqueNumbers = new Set(pointNumbers)

  if (!html.includes('/japan_daily_maps_mobile/live-map.css')) recordError(`${fileName}: не подключён live-map.css`)
  if (!html.includes('/japan_daily_maps_mobile/live-map.js')) recordError(`${fileName}: не подключён live-map.js`)
  if (uniqueNumbers.size !== points.length) recordError(`${fileName}: номера точек повторяются`)
  pointNumbers.forEach((number, index) => {
    if (number !== index + 1) recordError(`${fileName}: точки должны идти подряд; на позиции ${index + 1} стоит №${number}`)
  })

  const listedStops = [...html.matchAll(/class="stop"/g)].length
  if (listedStops !== points.length) recordError(`${fileName}: на карте ${points.length} точек, а в списке ${listedStops}`)

  const { entries, legs } = buildRoute(points, segments, fileName)
  const referencedPoints = new Set(entries.map((entry) => entry.pointNumber))
  for (const pointNumber of pointNumbers) {
    if (!referencedPoints.has(pointNumber)) recordError(`${fileName}: точка ${pointNumber} не входит ни в один маршрут`)
  }
  if (legs.length !== Math.max(0, entries.length - 1)) recordError(`${fileName}: нарушена последовательность участков маршрута`)

  const mappedDays = daysWithMaps.filter((day) => day.mapFile === fileName)
  for (const day of mappedDays) {
    const routeScenes = day.mapRouteScenes ?? []
    const minimum = day.mapStartProgress ?? 0
    if (minimum < 0 || minimum > entries.length) recordError(`${day.id}: mapStartProgress выходит за границы карты`)

    if (routeScenes.length === 0) {
      recordWarning(`${day.id}: карта работает как обзорная — без текущей цели`)
      continue
    }
    if (routeScenes.length !== entries.length) {
      recordError(`${day.id}: ${routeScenes.length} групп сцен для ${entries.length} шагов карты`)
    }

    const timelineIds = new Set(day.timeline.map((item) => item.id))
    const timelineIndex = new Map(day.timeline.map((item, index) => [item.id, index]))
    const routeIndexesByScene = new Map()
    let furthestTimelineIndex = -1
    routeScenes.forEach((group, index) => {
      if (!Array.isArray(group) || group.length === 0) recordError(`${day.id}: пустая группа сцен у шага ${index + 1}`)
      let previousGroupIndex = -1
      group.forEach((sceneId) => {
        if (!timelineIds.has(sceneId)) recordError(`${day.id}: сцена ${sceneId} у шага ${index + 1} отсутствует в timeline`)
        const routeIndexes = routeIndexesByScene.get(sceneId) ?? []
        routeIndexes.push(index)
        routeIndexesByScene.set(sceneId, routeIndexes)
        const sceneIndex = timelineIndex.get(sceneId)
        if (sceneIndex === undefined) return
        if (sceneIndex < previousGroupIndex) recordError(`${day.id}: сцены у шага ${index + 1} записаны не в порядке timeline`)
        previousGroupIndex = sceneIndex
      })
      const groupStart = Math.min(...group.map((sceneId) => timelineIndex.get(sceneId) ?? Number.POSITIVE_INFINITY))
      if (groupStart < furthestTimelineIndex && !group.some((sceneId) => timelineIndex.get(sceneId) === furthestTimelineIndex)) {
        recordError(`${day.id}: маршрут возвращается к более ранней сцене у шага ${index + 1}`)
      }
      furthestTimelineIndex = Math.max(furthestTimelineIndex, ...group.map((sceneId) => timelineIndex.get(sceneId) ?? -1))
    })
    for (const [sceneId, routeIndexes] of routeIndexesByScene) {
      routeIndexes.slice(1).forEach((routeIndex, index) => {
        if (routeIndex !== routeIndexes[index] + 1) {
          recordError(`${day.id}: сцена ${sceneId} привязана к несмежным шагам карты`)
        }
      })
    }
  }

  summaries.push(`${fileName}: ${points.length} точек, ${entries.length} шагов, ${legs.length} участков`)
}

summaries.forEach((summary) => console.log(`✓ ${summary}`))
warnings.forEach((warning) => console.warn(`! ${warning}`))

if (errors.length > 0) {
  errors.forEach((error) => console.error(`✗ ${error}`))
  process.exitCode = 1
} else {
  console.log(`Карты проверены: ${mapFilesInData.size} файлов, ${daysWithMaps.length} дневных состояний, ошибок нет.`)
}
