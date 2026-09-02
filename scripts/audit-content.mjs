import { access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { animeFrameGuides } from '../src/animeFrameGuides.ts'
import { kitsuMagicDays, sealedLetters } from '../src/kitsuMagic.ts'
import { sceneGuides } from '../src/sceneGuides.ts'
import { achievements, passportStamps, sideQuests, tripDays } from '../src/tripData.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDirectory = path.join(projectRoot, 'public')
const errors = []
const warnings = []

const error = (message) => errors.push(message)
const warning = (message) => warnings.push(message)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

function checkUnique(items, label, getId = (item) => item.id) {
  const seen = new Set()
  for (const item of items) {
    const id = getId(item)
    if (!nonEmpty(id)) {
      error(`${label}: найден пустой id`)
      continue
    }
    if (seen.has(id)) error(`${label}: id ${id} повторяется`)
    seen.add(id)
  }
}

async function checkPublicFile(url, label) {
  if (!nonEmpty(url) || !url.startsWith('/')) {
    error(`${label}: некорректный путь ${String(url)}`)
    return
  }
  try {
    await access(path.join(publicDirectory, url.slice(1)))
  } catch {
    error(`${label}: отсутствует ${url}`)
  }
}

checkUnique(tripDays, 'Дни')
checkUnique(achievements, 'Достижения')
checkUnique(sideQuests, 'Случайные находки')
checkUnique(passportStamps, 'Печати')
checkUnique(kitsuMagicDays, 'Огни Кицу', (magic) => magic.dayId)
checkUnique(sealedLetters, 'Письма')

const dayById = new Map(tripDays.map((day) => [day.id, day]))
const achievementById = new Map(achievements.map((achievement) => [achievement.id, achievement]))
const allSceneIds = new Set()
let previousDate = ''

for (const day of tripDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Number.isNaN(Date.parse(`${day.date}T00:00:00Z`))) {
    error(`${day.id}: неверная дата ${day.date}`)
  }
  if (previousDate && day.date <= previousDate) error(`${day.id}: дни стоят не по возрастанию даты`)
  previousDate = day.date

  const expectedDateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${day.date}T00:00:00Z`))
  if (day.dateLabel !== expectedDateLabel) error(`${day.id}: подпись даты «${day.dateLabel}», ожидалось «${expectedDateLabel}»`)
  if (day.timeline.length === 0) error(`${day.id}: в дне нет сцен`)

  const daySceneIds = new Set()
  for (const scene of day.timeline) {
    if (daySceneIds.has(scene.id)) error(`${day.id}: сцена ${scene.id} повторяется внутри дня`)
    if (allSceneIds.has(scene.id)) error(`${day.id}: сцена ${scene.id} повторяется в другом дне`)
    daySceneIds.add(scene.id)
    allSceneIds.add(scene.id)
    if (!nonEmpty(scene.time) || !nonEmpty(scene.title)) error(`${day.id}/${scene.id}: не заполнены время или название`)
    if (!Array.isArray(scene.details)) error(`${day.id}/${scene.id}: details должен быть массивом`)
  }

  if (day.riddle.options.length < 2) error(`${day.id}: у загадки меньше двух вариантов`)
  if (new Set(day.riddle.options).size !== day.riddle.options.length) error(`${day.id}: варианты загадки повторяются`)
  if (!Number.isInteger(day.riddle.answer) || day.riddle.answer < 0 || day.riddle.answer >= day.riddle.options.length) {
    error(`${day.id}: правильный ответ загадки выходит за границы вариантов`)
  }

  if (day.achievementId) {
    const achievement = achievementById.get(day.achievementId)
    if (!achievement) error(`${day.id}: достижение ${day.achievementId} отсутствует`)
    else {
      if (achievement.type !== 'story') error(`${day.id}: дневное достижение ${achievement.id} не относится к истории`)
      if (achievement.unlockDate !== day.date) error(`${day.id}: дата достижения ${achievement.id} не совпадает с датой дня`)
      if (day.achievementTitle && day.achievementTitle !== achievement.title) error(`${day.id}: название достижения расходится с коллекцией`)
    }
  }

  await checkPublicFile(day.cover, `${day.id}: обложка`)
  if (day.mapFile) await checkPublicFile(`/japan_daily_maps_mobile/${day.mapFile}`, `${day.id}: карта`)
}

for (const achievement of achievements) await checkPublicFile(achievement.image, `${achievement.id}: изображение достижения`)

for (const [sceneId, guides] of Object.entries(sceneGuides)) {
  if (!allSceneIds.has(sceneId)) error(`Подсказки ссылаются на отсутствующую сцену ${sceneId}`)
  if (!Array.isArray(guides) || guides.length === 0) warning(`${sceneId}: список подсказок пуст`)
}

for (const [sceneId, frames] of Object.entries(animeFrameGuides)) {
  if (!allSceneIds.has(sceneId)) error(`Аниме-кадр ссылается на отсутствующую сцену ${sceneId}`)
  for (const frame of frames) await checkPublicFile(frame.image, `${sceneId}: аниме-кадр`)
}

const magicDayIds = new Set(kitsuMagicDays.map((magic) => magic.dayId))
for (const day of tripDays) {
  if (!magicDayIds.has(day.id)) error(`${day.id}: нет огонька Кицу`)
}
for (const magic of kitsuMagicDays) {
  if (!dayById.has(magic.dayId)) error(`${magic.dayId}: огонёк ссылается на отсутствующий день`)
}

for (const letter of sealedLetters) {
  if ('fireCount' in letter.unlock) {
    if (!Number.isInteger(letter.unlock.fireCount) || letter.unlock.fireCount < 1 || letter.unlock.fireCount > kitsuMagicDays.length) {
      error(`${letter.id}: неверное число огней для открытия`)
    }
    continue
  }

  const day = dayById.get(letter.unlock.dayId)
  if (!day) {
    error(`${letter.id}: письмо ссылается на отсутствующий день ${letter.unlock.dayId}`)
    continue
  }
  if (letter.unlock.stopId && !day.timeline.some((scene) => scene.id === letter.unlock.stopId)) {
    error(`${letter.id}: письмо ссылается на отсутствующую сцену ${letter.unlock.stopId}`)
  }
}

const referencedAchievementImages = new Set(achievements.map((achievement) => path.basename(achievement.image)))
const achievementFiles = await readdir(path.join(publicDirectory, 'assets', 'achivments'))
for (const fileName of achievementFiles.filter((name) => name.endsWith('.webp'))) {
  if (!referencedAchievementImages.has(fileName)) warning(`Неиспользуемая картинка достижения: ${fileName}`)
}

for (const commonAsset of [
  '/assets/chonchetrip-icon.png',
  '/assets/chonchetrip-splash.webp',
  '/assets/kitsune-guide.webp',
  '/assets/kitsu-tail.webp',
]) {
  await checkPublicFile(commonAsset, 'Общий ресурс')
}

warnings.forEach((message) => console.warn(`! ${message}`))

if (errors.length > 0) {
  errors.forEach((message) => console.error(`✗ ${message}`))
  process.exitCode = 1
} else {
  console.log(`Контент проверен: ${tripDays.length} дней, ${allSceneIds.size} сцен, ${achievements.length} достижений, ${kitsuMagicDays.length} огней, ${sealedLetters.length} писем.`)
}
