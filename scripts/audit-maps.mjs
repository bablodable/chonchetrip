import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { tripDays } from '../src/tripData.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mapDirectory = path.join(projectRoot, 'public', 'japan_daily_maps_mobile')
const errors = []
const warnings = []
let simulatedStates = 0

const recordError = (message) => errors.push(message)
const recordWarning = (message) => warnings.push(message)

const liveMapSource = await readFile(path.join(mapDirectory, 'live-map.js'), 'utf8')

function classList() {
  const values = new Set()
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => {
      if (force === undefined ? !values.has(name) : force) values.add(name)
      else values.delete(name)
    },
    contains: (name) => values.has(name),
  }
}

function createLiveMapRuntime(points, segments) {
  const messageHandlers = []
  const markerIcons = new Map()
  const stops = points.map(() => ({ classList: classList() }))

  class Polyline {}
  class Polygon extends Polyline {}

  const routeLayer = {
    lines: [],
    addTo: () => routeLayer,
    clearLayers: () => { routeLayer.lines = [] },
  }
  const map = {
    eachLayer: () => {},
    removeLayer: () => {},
    getZoom: () => 13,
    setView: () => {},
    fitBounds: () => {},
    invalidateSize: () => {},
  }
  const markerMap = Object.fromEntries(points.map((point) => [point.n, {
    setIcon: (icon) => markerIcons.set(point.n, icon),
    unbindTooltip: () => {},
    bindTooltip: () => {},
  }]))
  const createElement = (_tag, className = '') => ({
    className,
    classList: classList(),
    setAttribute: () => {},
  })

  const L = {
    Polyline,
    Polygon,
    layerGroup: () => routeLayer,
    control: () => ({
      onAdd: null,
      addTo(target) {
        this.element = this.onAdd?.(target)
        return this
      },
    }),
    DomUtil: { create: createElement },
    DomEvent: { disableClickPropagation: () => {}, on: () => {} },
    divIcon: (options) => options,
    polyline: (coordinates, options) => {
      const line = Object.assign(new Polyline(), {
        coordinates,
        options,
        addTo(target) {
          if (target === routeLayer) target.lines.push(this)
          return this
        },
      })
      return line
    },
    marker: () => ({ addTo: () => ({ bindTooltip: () => {} }) }),
    circle: () => ({ addTo: () => ({}) }),
  }
  const location = { search: '', origin: 'https://map.test' }
  const window = {
    location,
    isSecureContext: true,
    addEventListener: (type, handler) => {
      if (type === 'message') messageHandlers.push(handler)
    },
  }
  const document = {
    documentElement: { classList: classList() },
    querySelectorAll: (selector) => selector === '#stops .stop' ? stops : [],
  }

  vm.runInNewContext(liveMapSource, {
    L,
    map,
    points,
    segments,
    markerMap,
    window,
    document,
    navigator: {},
    URLSearchParams,
    JSON,
    Math,
    Number,
    Set,
    Map,
    Array,
    setTimeout: () => 0,
  }, { filename: 'live-map.js' })

  return {
    render({ dayId, completedSceneIds, routeScenes, minimumSteps }) {
      messageHandlers.forEach((handler) => handler({
        origin: location.origin,
        data: { type: 'chonchetrip-map-progress', dayId, completedSceneIds, routeScenes, minimumSteps },
      }))
      const markerStates = points.map((point) => {
        const html = markerIcons.get(point.n)?.html ?? ''
        if (html.includes('live-passed')) return 'passed'
        if (html.includes('live-next')) return 'current'
        if (html.includes('live-future')) return 'future'
        return 'unknown'
      })
      return {
        routeStates: routeLayer.lines.map((line) => line.options.className?.replace('live-route-', '')),
        markerStates,
        stopStates: stops.map((stop) => stop.classList.contains('live-passed')
          ? 'passed'
          : stop.classList.contains('live-next') ? 'current' : 'future'),
      }
    },
  }
}

function routeTargetIndex(routeScenes, completedSceneIds, minimumSteps, entryCount) {
  let activeSceneId = null
  for (let index = minimumSteps; index < entryCount; index += 1) {
    const group = Array.isArray(routeScenes[index]) ? routeScenes[index] : []
    activeSceneId = group.find((sceneId) => !completedSceneIds.has(sceneId)) ?? null
    if (activeSceneId) break
  }
  if (!activeSceneId) return -1
  return routeScenes.findIndex((group, index) => index >= minimumSteps && group.includes(activeSceneId))
}

function expectedProgressStates(points, entries, legs, routeScenes, completedSceneIds, minimumSteps) {
  const targetIndex = routeTargetIndex(routeScenes, completedSceneIds, minimumSteps, entries.length)
  const entryComplete = (index) => {
    if (index < minimumSteps) return true
    const group = Array.isArray(routeScenes[index]) ? routeScenes[index] : []
    return group.length > 0 && group.every((sceneId) => completedSceneIds.has(sceneId))
  }
  const routeStates = legs.map((_, index) => {
    const destinationIndex = index + 1
    const passed = targetIndex >= 0 ? destinationIndex < targetIndex : entryComplete(destinationIndex)
    return passed ? 'passed' : destinationIndex === targetIndex ? 'current' : 'future'
  })
  const markerStates = points.map((point) => {
    const occurrences = entries
      .map((entry, index) => entry.pointNumber === point.n ? index : -1)
      .filter((index) => index >= 0)
    if (targetIndex >= 0) {
      if (occurrences.includes(targetIndex)) return 'current'
      return occurrences.every((index) => index < targetIndex) ? 'passed' : 'future'
    }
    return occurrences.every(entryComplete) ? 'passed' : 'future'
  })
  return { targetIndex, routeStates, markerStates }
}

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
  if (fileName === '2026-10-09-fuji.html' && /перенос\S*\s+на\s+11\.10/i.test(html)) {
    recordError(`${fileName}: Fuji закреплена за 09.10 и не должна предлагать перенос на 11.10`)
  }
  if (uniqueNumbers.size !== points.length) recordError(`${fileName}: номера точек повторяются`)
  pointNumbers.forEach((number, index) => {
    if (number !== index + 1) recordError(`${fileName}: точки должны идти подряд; на позиции ${index + 1} стоит №${number}`)
  })

  const listedStops = [...html.matchAll(/class="stop"/g)].length
  if (listedStops !== points.length) recordError(`${fileName}: на карте ${points.length} точек, а в списке ${listedStops}`)

  const { entries, legs } = buildRoute(points, segments, fileName)
  let liveRuntime = null
  try {
    liveRuntime = createLiveMapRuntime(points, segments)
  } catch (error) {
    recordError(`${fileName}: live-map.js не запускается в проверочной среде (${error.message})`)
  }
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

    const timelineIdSet = new Set(day.timeline.map((item) => item.id))
    const timelineIndex = new Map(day.timeline.map((item, index) => [item.id, index]))
    const routeIndexesByScene = new Map()
    let furthestTimelineIndex = -1
    routeScenes.forEach((group, index) => {
      if (!Array.isArray(group) || group.length === 0) recordError(`${day.id}: пустая группа сцен у шага ${index + 1}`)
      let previousGroupIndex = -1
      group.forEach((sceneId) => {
        if (!timelineIdSet.has(sceneId)) recordError(`${day.id}: сцена ${sceneId} у шага ${index + 1} отсутствует в timeline`)
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

    const timelineIds = [...new Set(day.timeline.map((item) => item.id))]
    const mappedSceneIds = new Set(routeScenes.flat())
    const nonRouteSceneIds = new Set(day.mapNonRouteScenes ?? [])
    const accidentalUnmappedSceneIds = timelineIds.filter((sceneId) => !mappedSceneIds.has(sceneId) && !nonRouteSceneIds.has(sceneId))
    const invalidNonRouteSceneIds = [...nonRouteSceneIds].filter((sceneId) => !timelineIds.includes(sceneId) || mappedSceneIds.has(sceneId))
    if (accidentalUnmappedSceneIds.length > 0) {
      recordError(`${day.id}: сцены дня случайно не привязаны к карте: ${accidentalUnmappedSceneIds.join(', ')}`)
    }
    if (invalidNonRouteSceneIds.length > 0) {
      recordError(`${day.id}: некорректные немаршрутные сцены: ${invalidNonRouteSceneIds.join(', ')}`)
    }

    if (liveRuntime && routeScenes.length === entries.length && routeScenes.every(Array.isArray)) {
      const stateCases = []
      const knownStates = new Set()
      const addState = (label, values) => {
        const completed = new Set(values)
        const key = timelineIds.filter((sceneId) => completed.has(sceneId)).join('|')
        if (knownStates.has(key)) return
        knownStates.add(key)
        stateCases.push({ label, completed })
      }

      for (let count = 0; count <= timelineIds.length; count += 1) {
        addState(`первые ${count}`, timelineIds.slice(0, count))
      }
      timelineIds.forEach((missingSceneId) => {
        addState(`всё, кроме ${missingSceneId}`, timelineIds.filter((sceneId) => sceneId !== missingSceneId))
      })
      addState('через одну', timelineIds.filter((_, index) => index % 2 === 0))

      for (const { label, completed } of stateCases) {
        simulatedStates += 1
        const actual = liveRuntime.render({
          dayId: day.id,
          completedSceneIds: [...completed],
          routeScenes,
          minimumSteps: minimum,
        })
        const expected = expectedProgressStates(points, entries, legs, routeScenes, completed, minimum)
        const routeMatches = JSON.stringify(actual.routeStates) === JSON.stringify(expected.routeStates)
        const markersMatch = JSON.stringify(actual.markerStates) === JSON.stringify(expected.markerStates)
        const listMatches = JSON.stringify(actual.stopStates) === JSON.stringify(expected.markerStates)
        const currentRouteCount = actual.routeStates.filter((state) => state === 'current').length
        const expectedCurrentRouteCount = expected.targetIndex > 0 ? 1 : 0

        if (!routeMatches || !markersMatch || !listMatches || currentRouteCount !== expectedCurrentRouteCount) {
          recordError(`${day.id}: неверное отображение прогресса (${label}); текущих участков ${currentRouteCount}, ожидалось ${expectedCurrentRouteCount}`)
          break
        }
      }
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
  console.log(`Карты проверены: ${mapFilesInData.size} файлов, ${daysWithMaps.length} дневных состояний, ${simulatedStates} вариантов прогресса, ошибок нет.`)
}
