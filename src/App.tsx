import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import './App.css'
import {
  CloudSessionExpiredError,
  CloudUnavailableError,
  checkEditorSession,
  forgetAccessMode,
  loadAccessMode,
  loadSharedProgress,
  rememberAccessMode,
  saveSharedProgress,
  shouldKeepLocalProgress,
  startEditorSession,
  uploadSharedPhoto,
  type AccessMode,
} from './cloudSync'
import {
  downloadOfflinePack,
  readOfflinePackStatus,
  requestPersistentOfflineStorage,
  type OfflinePackStatus,
} from './offline'
import { loadPendingPhotos, removePendingPhoto, savePendingPhoto } from './offlineStorage'
import {
  achievements,
  passportStamps,
  sideQuests,
  tripDays,
  type DayVibe,
  type FoodOption,
  type Achievement,
  type FoodPlan,
  type TimelineItem,
  type TripDay,
} from './tripData'
import {
  kitsuMagicByDay,
  kitsuMagicDays,
  sealedLetters,
  type KitsuMagicDay,
  type SealedLetter,
} from './kitsuMagic'
import { sceneGuides } from './sceneGuides'
import { animeFrameGuides, type AnimeFrameGuide } from './animeFrameGuides'
import { transitMaps } from './transitMaps'
import {
  JAPAN_TIME_ZONE,
  chapterUnlockTime,
  getJourneyClock,
  hourInTimeZone,
} from './journeyClock'

type ViewName = 'journey' | 'collection' | 'passport' | 'kitsu'
type CloudStatus = 'checking' | 'synced' | 'offline' | 'error'
type FromsoftRelic = 'dark-souls' | 'elden-ring'
type TripCounterId = 'ramen' | 'onigiri' | 'gachapon' | 'goshuin' | 'vending' | 'figures' | 'train'
type TripCounters = Record<TripCounterId, number>
type TripCounterDefinition = { id: TripCounterId; icon: string; title: string; actionLabel: string; finaleLabel: string; wide?: boolean }

const regularTripCounterDefinitions: TripCounterDefinition[] = [
  { id: 'ramen', icon: '🍜', title: 'Ramen', actionLabel: 'Ещё миска!', finaleLabel: 'мисок ramen' },
  { id: 'onigiri', icon: '🍙', title: 'Onigiri', actionLabel: 'Ещё один!', finaleLabel: 'onigiri' },
  { id: 'gachapon', icon: '🎰', title: 'Gachapon', actionLabel: 'Новая капсула!', finaleLabel: 'капсул gachapon' },
  { id: 'goshuin', icon: '⛩️', title: 'Goshuin', actionLabel: 'Новая запись!', finaleLabel: 'goshuin' },
  { id: 'vending', icon: '🥤', title: 'Автомат', actionLabel: 'Ещё напиток!', finaleLabel: 'напитков из автоматов' },
  { id: 'figures', icon: '🦸', title: 'Аниме-фигурка', actionLabel: 'Ещё одна в коллекцию!', finaleLabel: 'аниме-фигурок' },
]
const trainTripCounterDefinition: TripCounterDefinition = {
  id: 'train',
  icon: '🚅',
  title: 'Поездка на поезде',
  actionLabel: 'Ещё поездка!',
  finaleLabel: 'поездок на поезде',
  wide: true,
}
const tripCounterDefinitions = [...regularTripCounterDefinitions, trainTripCounterDefinition]

const emptyTripCounters: TripCounters = {
  ramen: 0,
  onigiri: 0,
  gachapon: 0,
  goshuin: 0,
  vending: 0,
  figures: 0,
  train: 0,
}

const currentSideQuestIds = new Set(sideQuests.map((quest) => quest.id))
const currentAchievementIds = new Set(achievements.map((achievement) => achievement.id))
const achievementGroups: Array<{ type: Achievement['type']; kicker: string; title: string; note: string }> = [
  { type: 'story', kicker: 'Дорога', title: 'Главы путешествия', note: 'По одной тёплой печати за день, который стал вашей историей.' },
  { type: 'secret', kicker: 'Маленькие чудеса', title: 'Особенные находки', note: 'Моменты, которые приятно было заметить и оставить с собой.' },
  { type: 'meta', kicker: 'Наша история', title: 'Большие воспоминания', note: 'Появляются, когда несколько случайных моментов складываются во что-то большее.' },
]

type ConfirmationRequest = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

type AmbientVisit = {
  id: number
  kind: 'tail' | 'eyes' | 'paws'
  side: 'left' | 'right'
}

type FoxFireFlight = {
  id: number
  color: string
}

type PawPath = 'diagonal-right' | 'diagonal-left' | 'snake-right' | 'snake-left'

type PawBurst = {
  id: number | string
  path: PawPath
}

const pawPathOrder: PawPath[] = ['diagonal-right', 'snake-left', 'diagonal-left', 'snake-right']
const pawTrailPaths: Record<PawPath, Array<{ x: number; y: number; angle: number }>> = {
  'diagonal-right': [
    { x: 12, y: 3, angle: -9 }, { x: 20, y: 15, angle: 8 }, { x: 16, y: 27, angle: -8 }, { x: 25, y: 39, angle: 9 },
    { x: 21, y: 51, angle: -8 }, { x: 30, y: 63, angle: 8 }, { x: 26, y: 75, angle: -7 }, { x: 35, y: 87, angle: 8 },
  ],
  'diagonal-left': [
    { x: 88, y: 3, angle: 9 }, { x: 80, y: 15, angle: -8 }, { x: 84, y: 27, angle: 8 }, { x: 75, y: 39, angle: -9 },
    { x: 79, y: 51, angle: 8 }, { x: 70, y: 63, angle: -8 }, { x: 74, y: 75, angle: 7 }, { x: 65, y: 87, angle: -8 },
  ],
  'snake-right': [
    { x: 18, y: 3, angle: -11 }, { x: 30, y: 15, angle: 9 }, { x: 22, y: 27, angle: -9 }, { x: 38, y: 39, angle: 11 },
    { x: 27, y: 51, angle: -10 }, { x: 45, y: 63, angle: 10 }, { x: 32, y: 75, angle: -9 }, { x: 50, y: 87, angle: 9 },
  ],
  'snake-left': [
    { x: 82, y: 3, angle: 11 }, { x: 70, y: 15, angle: -9 }, { x: 78, y: 27, angle: 9 }, { x: 62, y: 39, angle: -11 },
    { x: 73, y: 51, angle: 10 }, { x: 55, y: 63, angle: -10 }, { x: 68, y: 75, angle: 9 }, { x: 50, y: 87, angle: -9 },
  ],
}

function pawPathForKey(key: string): PawPath {
  const hash = [...key].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0)
  return pawPathOrder[hash % pawPathOrder.length]
}

type AchievementTheme = 'frieren' | 'pokemon' | 'murakami'

const achievementThemes: Partial<Record<string, AchievementTheme>> = {
  'beyond-the-journey': 'frieren',
  'kitsu-i-choose-you': 'pokemon',
  'library-between-worlds': 'murakami',
}

type Progress = {
  claimed: string[]
  checkedStops: Record<string, string[]>
  unlockedStops: Record<string, string[]>
  unlockedDays: string[]
  hints: string[]
  reveals: string[]
  solvedRiddles: string[]
  riddleAnswers: Record<string, number>
  stamps: string[]
  sideQuests: string[]
  konbini: string[]
  ramen: boolean
  ratings: Record<string, number>
  dailySteps: Record<string, number>
  photos: Record<string, string>
  foxFires: string[]
  kitsuEncounters: string[]
  openedLetters: string[]
  finaleOpened: boolean
  fromsoftRelic: FromsoftRelic | null
  fromsoftEmberUsedAt: string | null
  tripCounters: TripCounters
}

const timelineLeadLabels: Record<TimelineItem['kind'], string> = {
  route: 'Маршрут',
  place: 'Что посмотреть',
  food: 'Что попробовать',
  quest: 'Что сделать',
  rest: 'Пауза',
}

function getTimelineDetailLabel(item: TimelineItem, detail: string, index: number) {
  if (index === 0) return timelineLeadLabels[item.kind]

  const normalized = detail.toLocaleLowerCase('ru')
  if (/если|по настроению|на выбор|можно|(?:^|[\s,.—:])или(?:$|[\s,.—:])/.test(normalized)) return 'На выбор'
  if (/билет|брон|qr|suica|паспорт|оплат|касс|вход|stamp|график/.test(normalized)) return 'Важно'
  if (/затем|после|домой|station|line|доехать|перейти|поезд|выход/.test(normalized)) return 'Дальше'
  return 'Ещё'
}

const PREVIEW_DATE = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null
const PREVIEW_MODE = Boolean(PREVIEW_DATE)
const STORAGE_KEY = PREVIEW_MODE
  ? 'chonchetrip-preview-progress-v1'
  : 'chonchetrip-live-progress-v1'
const CLOUD_SNAPSHOT_KEY = `${STORAGE_KEY}-cloud-snapshot-v1`
const CLOUD_PENDING_KEY = `${STORAGE_KEY}-cloud-pending-v1`

const emptyProgress: Progress = {
  claimed: [],
  checkedStops: {},
  unlockedStops: {},
  unlockedDays: [],
  hints: [],
  reveals: [],
  solvedRiddles: [],
  riddleAnswers: {},
  stamps: [],
  sideQuests: [],
  konbini: [],
  ramen: false,
  ratings: {},
  dailySteps: {},
  photos: {},
  foxFires: [],
  kitsuEncounters: [],
  openedLetters: [],
  finaleOpened: false,
  fromsoftRelic: null,
  fromsoftEmberUsedAt: null,
  tripCounters: emptyTripCounters,
}

const normalizeProgress = (value: unknown): Progress => {
  const parsed = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Progress>
    : {}
  const storedCounters = parsed.tripCounters ?? emptyTripCounters
  const legacySweetsCount = (storedCounters as Partial<TripCounters> & { sweets?: number }).sweets
  const storedSteps = parsed.dailySteps ?? {}
  const storedRiddleAnswers = parsed.riddleAnswers ?? {}
  const storedFromsoftEmber = typeof parsed.fromsoftEmberUsedAt === 'string'
    && parsed.fromsoftEmberUsedAt.endsWith(':riddle')
    ? parsed.fromsoftEmberUsedAt
    : null
  const dailySteps = Object.fromEntries(
    Object.entries(storedSteps).flatMap(([dayId, rawSteps]) => {
      const steps = typeof rawSteps === 'number' ? rawSteps : Number(rawSteps)
      return Number.isFinite(steps) && steps > 0
        ? [[dayId, Math.min(100_000, Math.round(steps))]]
        : []
    }),
  ) as Record<string, number>
  return {
    ...emptyProgress,
    claimed: (parsed.claimed ?? []).filter((id) => currentAchievementIds.has(id)),
    checkedStops: parsed.checkedStops ?? {},
    unlockedStops: parsed.unlockedStops ?? {},
    unlockedDays: parsed.unlockedDays ?? [],
    hints: parsed.hints ?? [],
    reveals: parsed.reveals ?? [],
    solvedRiddles: parsed.solvedRiddles ?? [],
    riddleAnswers: Object.fromEntries(
      Object.entries(storedRiddleAnswers).flatMap(([dayId, rawAnswer]) => {
        const answer = Number(rawAnswer)
        return Number.isInteger(answer) && answer >= 0 && answer <= 20 ? [[dayId, answer]] : []
      }),
    ),
    stamps: parsed.stamps ?? [],
    sideQuests: (parsed.sideQuests ?? []).filter((id) => currentSideQuestIds.has(id)),
    konbini: parsed.konbini ?? [],
    ramen: parsed.ramen ?? false,
    ratings: parsed.ratings ?? {},
    dailySteps,
    photos: parsed.photos ?? {},
    foxFires: parsed.foxFires ?? [],
    kitsuEncounters: parsed.kitsuEncounters ?? [],
    openedLetters: parsed.openedLetters ?? [],
    finaleOpened: parsed.finaleOpened ?? false,
    fromsoftRelic: parsed.fromsoftRelic ?? null,
    fromsoftEmberUsedAt: storedFromsoftEmber,
    tripCounters: {
      ramen: Math.max(0, storedCounters.ramen ?? (parsed.ramen ? 1 : 0)),
      onigiri: Math.max(0, storedCounters.onigiri ?? 0),
      gachapon: Math.max(0, storedCounters.gachapon ?? 0),
      goshuin: Math.max(0, storedCounters.goshuin ?? 0),
      vending: Math.max(0, storedCounters.vending ?? 0),
      figures: Math.max(0, storedCounters.figures ?? legacySweetsCount ?? 0),
      train: Math.max(0, storedCounters.train ?? 0),
    },
  }
}

const progressForCloud = ({ photos: _photos, ...progress }: Progress) => progress

const stopAchievementRules = [
  { dayId: 'usj', achievementId: 'beyond-the-journey', stops: ['frieren-lunch'] },
  { dayId: 'nara', achievementId: 'kitsu-i-choose-you', stops: ['pokemon-osaka'] },
  { dayId: 'hello-tokyo', achievementId: 'weather-child', stops: ['shiba', 'tower'] },
  { dayId: 'shibuya-story', achievementId: 'shibuya-incident', stops: ['jujutsu-route'] },
  { dayId: 'shibuya-story', achievementId: 'i-remember-you', stops: ['suga-steps'] },
  { dayId: 'ginza-akihabara', achievementId: 'el-psy-kongroo', stops: ['kanda-myojin-anime', 'steins-gate-line'] },
  { dayId: 'asakusa-nakano', achievementId: 'library-between-worlds', stops: ['murakami-library'] },
] as const

function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return emptyProgress
    return normalizeProgress(JSON.parse(stored))
  } catch {
    return emptyProgress
  }
}

function loadCloudSnapshot(): string {
  try {
    return localStorage.getItem(CLOUD_SNAPSHOT_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveCloudSnapshot(snapshot: string) {
  try {
    localStorage.setItem(CLOUD_SNAPSHOT_KEY, snapshot)
  } catch {
    // Progress still remains available in memory when Safari storage is full.
  }
}

function loadCloudPending(): boolean {
  try {
    return localStorage.getItem(CLOUD_PENDING_KEY) === '1'
  } catch {
    return false
  }
}

function saveCloudPending(pending: boolean) {
  try {
    if (pending) localStorage.setItem(CLOUD_PENDING_KEY, '1')
    else localStorage.removeItem(CLOUD_PENDING_KEY)
  } catch {
    // The in-memory marker still protects changes made during this session.
  }
}

function useJourneyClock() {
  const [clock, setClock] = useState(getJourneyClock)

  useEffect(() => {
    let minuteTimer: number | undefined
    const syncClock = () => {
      setClock(getJourneyClock())
      const nextMinute = 60_000 - (Date.now() % 60_000) + 100
      minuteTimer = window.setTimeout(syncClock, nextMinute)
    }
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (minuteTimer) window.clearTimeout(minuteTimer)
      syncClock()
    }

    syncClock()
    document.addEventListener('visibilitychange', syncWhenVisible)
    window.addEventListener('pageshow', syncWhenVisible)
    return () => {
      if (minuteTimer) window.clearTimeout(minuteTimer)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      window.removeEventListener('pageshow', syncWhenVisible)
    }
  }, [])

  return clock
}

function dayContentForDate(date: string): TripDay {
  return tripDays.find((day) => day.date === date) ?? tripDays[0]
}

function daysUntil(date: string): number {
  return Math.max(0, Math.ceil((chapterUnlockTime(date) - Date.now()) / 86_400_000))
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать снимок. Попробуй выбрать его ещё раз'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Этот снимок не открылся. Попробуй выбрать другой'))
      image.onload = () => {
        const maxSide = 760
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Этот формат снимка не поддерживается'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.68))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    journey: <><path d="M4 19.5V6.8l5-2.3 6 2.3 5-2.3v12.7l-5 2.3-6-2.3-5 2.3Z"/><path d="M9 4.5v12.7M15 6.8v12.7"/></>,
    collection: <><path d="M8 4h8l2 3-6 13L6 7l2-3Z"/><path d="M6 7h12M9 7l3 13 3-13"/></>,
    passport: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M7.5 16.5 16.5 7.5M6 7h5M9 5l2 2-2 2"/></>,
    place: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    food: <><path d="M5 3v7M8 3v7M5 7h3M6.5 10v11M16 3c2 3 2 7 0 9v9M16 3v9"/></>,
    quest: <path d="m12 3 2.3 4.7L19.5 9l-3.8 3.7.9 5.3-4.6-2.5L7.4 18l.9-5.3L4.5 9l5.2-1.3L12 3Z"/>,
    rest: <><path d="M4 18h16M6 18v-8h12a2 2 0 0 1 2 2v6M6 14h14M6 10V7h5a3 3 0 0 1 3 3"/></>,
    sparkles: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16Z"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    hint: <><path d="M9 18h6M10 22h4M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.8-1.5-2.5Z"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    camera: <><path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z"/><circle cx="12" cy="13" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    download: <><path d="M12 3v11M8 10l4 4 4-4"/><path d="M5 17v3h14v-3"/></>,
    stamp: <><path d="M7 20h10M8 17h8l-1-5H9l-1 5ZM9 12c0-2 1-3 1-5a2 2 0 0 1 4 0c0 2 1 3 1 5"/></>,
    bowl: <><path d="M4 11h16c0 5-3 8-8 8s-8-3-8-8ZM8 22h8M7 7c0-2 2-2 2-4M12 7c0-2 2-2 2-4M17 7c0-2 2-2 2-4"/></>,
    fox: <><path d="M5 9 3 3l6 3h6l6-3-2 6v5c0 4-3 7-7 7s-7-3-7-7V9Z"/><path d="m9 15 3 2 3-2M9 11h.01M15 11h.01"/></>,
  }

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.sparkles}</svg>
}

function AchievementVisual({ achievement, locked = false, eager = false }: { achievement: Achievement; locked?: boolean; eager?: boolean }) {
  return <img className={locked ? 'badge-image is-locked' : 'badge-image'} src={achievement.image} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [active])
}

function AchievementThemeFlourish({ theme }: { theme: AchievementTheme }) {
  if (theme === 'frieren') {
    return (
      <div className="achievement-theme-flourish flourish-frieren" aria-hidden="true">
        <span className="frieren-hourglass"><i /><b /></span>
        <span className="frieren-time-ring" />
        <span className="frieren-time-spark" />
      </div>
    )
  }

  if (theme === 'pokemon') {
    return (
      <div className="achievement-theme-flourish flourish-pokemon" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        <span className="pokemon-orbit" />
      </div>
    )
  }

  return (
    <div className="achievement-theme-flourish flourish-murakami" aria-hidden="true">
      <svg viewBox="0 0 390 520" preserveAspectRatio="none">
        <path pathLength="1" d="M-18 366 C70 292 103 434 183 338 S303 218 420 292" />
        <circle cx="183" cy="338" r="4" />
      </svg>
      <span className="murakami-page">頁</span>
    </div>
  )
}

function KitsuBackgroundEyes({ className = '' }: { className?: string }) {
  return (
    <span className={`kitsu-background-eyes${className ? ` ${className}` : ''}`} aria-hidden="true">
      <i /><i />
    </span>
  )
}

function AmbientTailVisit({ visit }: { visit: AmbientVisit }) {
  return (
    <div className={`ambient-tail-visit from-${visit.side}`} aria-hidden="true">
      <img src="/assets/kitsu-tail.webp" alt="" />
    </div>
  )
}

function AmbientEyesBackdrop({ side }: { side: AmbientVisit['side'] }) {
  return (
    <>
      <span className="ambient-eye-dim" aria-hidden="true" />
      <KitsuBackgroundEyes className={`ambient-eyes-backdrop from-${side}`} />
    </>
  )
}

function ScenePawTrail({ path, onDone }: { path: PawPath; onDone: () => void }) {
  return (
    <div className={`ambient-paw-trail path-${path}`} aria-hidden="true" onAnimationEnd={(event) => { if (event.currentTarget === event.target) onDone() }}>
      {pawTrailPaths[path].map((step, index) => (
        <span key={index} style={{ '--paw-x': `${step.x}%`, '--paw-y': `${step.y}%`, '--paw-angle': `${step.angle}deg`, '--paw-delay': `${index * 165}ms` } as React.CSSProperties}>
          <svg viewBox="0 0 40 46" aria-hidden="true">
            <ellipse cx="20" cy="32" rx="10.5" ry="11.5" />
            <ellipse cx="7.5" cy="17" rx="4.3" ry="6.1" transform="rotate(-22 7.5 17)" />
            <ellipse cx="16" cy="10" rx="4.4" ry="6.2" transform="rotate(-7 16 10)" />
            <ellipse cx="25" cy="10" rx="4.4" ry="6.2" transform="rotate(7 25 10)" />
            <ellipse cx="33" cy="17" rx="4.3" ry="6.1" transform="rotate(22 33 17)" />
          </svg>
        </span>
      ))}
    </div>
  )
}

function FoxFireFlightEffect({ flight, onDone }: { flight: FoxFireFlight; onDone: () => void }) {
  return (
    <div
      className="ambient-foxfire-flight"
      aria-hidden="true"
      style={{ '--flame-color': flight.color } as React.CSSProperties}
      onAnimationEnd={(event) => { if (event.currentTarget === event.target) onDone() }}
    >
      <span className="fox-fire is-burning"><i /></span>
      <i className="foxfire-flight-spark spark-one" />
      <i className="foxfire-flight-spark spark-two" />
      <i className="foxfire-flight-spark spark-three" />
    </div>
  )
}

function AchievementModal({ achievement, isNew, onClose }: { achievement: Achievement; isNew: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const theme = achievementThemes[achievement.id]
  useBodyScrollLock()
  useEffect(() => {
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="achievement-modal" role="dialog" aria-modal="true" aria-label={achievement.title} onClick={onClose}>
      <div className={`achievement-modal-card${isNew ? ' is-new' : ''}${theme ? ` theme-${theme}` : ''}`} onClick={(event) => event.stopPropagation()}>
        {theme && <AchievementThemeFlourish theme={theme} />}
        <div className="modal-rays" aria-hidden="true" />
        <p className="modal-kicker">{isNew ? 'Новая печать пути' : 'Печать из коллекции'}</p>
        <div className="modal-badge"><AchievementVisual achievement={achievement} eager /></div>
        <h2>{achievement.title}</h2>
        <p>{achievement.description}</p>
        <button ref={closeRef} className="primary-button" type="button" onClick={onClose}>Продолжить путь</button>
      </div>
    </div>
  )
}

function FinaleCount({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame: number | undefined
    const timer = window.setTimeout(() => {
      if (reduceMotion || value === 0) {
        setDisplayed(value)
        return
      }

      setDisplayed(0)
      let startedAt: number | undefined
      const tick = (now: number) => {
        startedAt ??= now
        const progress = Math.min(1, (now - startedAt) / 820)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayed(Math.round(value * eased))
        if (progress < 1) frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }, reduceMotion || value === 0 ? 0 : delay)

    return () => {
      window.clearTimeout(timer)
      if (frame !== undefined) window.cancelAnimationFrame(frame)
    }
  }, [delay, value])

  return <strong className="finale-count" aria-label={String(value)}>{displayed}</strong>
}

function MagicDiscoveryModal({ magic, onClose }: { magic: KitsuMagicDay; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock()
  useEffect(() => {
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="magic-modal" role="dialog" aria-modal="true" aria-label={magic.flameTitle} onClick={onClose}>
      <div className="magic-modal-card" onClick={(event) => event.stopPropagation()} style={{ '--flame-color': magic.flameColor } as React.CSSProperties}>
        <div className="magic-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <span className="magic-modal-kicker">Лисий огонёк найден</span>
        <span className="fox-fire is-burning" aria-hidden="true"><i /></span>
        <h2>{magic.flameTitle}</h2>
        <p>{magic.discovery}</p>
        <button ref={closeRef} className="primary-button" type="button" onClick={onClose}>Сохранить огонёк</button>
      </div>
    </div>
  )
}

function LetterModal({ letter, onClose }: { letter: SealedLetter; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock()

  useEffect(() => {
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="letter-modal" role="dialog" aria-modal="true" aria-labelledby="letter-modal-title" onClick={onClose}>
      <article className="letter-modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="letter-paper-fold" aria-hidden="true" />
        <button ref={closeRef} type="button" className="letter-modal-close" aria-label="Закрыть письмо" onClick={onClose}>×</button>
        <span className="letter-modal-private"><Icon name="lock" size={12} /> Только для Юльчоны</span>
        <span className="letter-modal-seal" aria-hidden="true">{letter.seal}</span>
        <h2 id="letter-modal-title">{letter.title}</h2>
        <div className="letter-modal-text">
          {letter.text.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <span className="letter-modal-foot">Кицу сохранил эти слова в дороге</span>
      </article>
    </div>
  )
}

function KitsuReactionToast({ message }: { message: string }) {
  return (
    <div className="kitsu-reaction" role="status">
      <img src="/assets/kitsune-guide.webp" alt="" />
      <div><span>Кицу заметил</span><p>{message}</p></div>
    </div>
  )
}

type IllustratedTripCounterId = Exclude<TripCounterId, 'train'>

function TripCounterArt({ id }: { id: IllustratedTripCounterId }) {
  const drawings: Record<IllustratedTripCounterId, React.ReactNode> = {
    ramen: <><path d="M19 57h82c-3 22-17 31-41 31S22 79 19 57Z" /><path d="M27 57c6-8 18-12 33-12s27 4 33 12M42 42c-5-8 5-11 0-20M60 42c-5-8 5-11 0-20M78 42c-5-8 5-11 0-20M35 91h50" /><path d="m77 14 25 38M84 10l24 38" /></>,
    onigiri: <><path d="M60 15c8 0 34 38 37 51 3 14-10 23-37 23S20 80 23 66c3-13 29-51 37-51Z" /><path d="M43 64h34v25H43z" /><circle cx="44" cy="48" r="2" /><circle cx="73" cy="39" r="2" /><path d="M31 68c8 4 15 5 21 5M89 68c-8 4-15 5-21 5" /></>,
    gachapon: <><rect x="27" y="10" width="66" height="80" rx="13" /><circle cx="60" cy="40" r="25" /><circle cx="48" cy="31" r="7" /><circle cx="67" cy="27" r="7" /><circle cx="73" cy="47" r="7" /><circle cx="50" cy="50" r="7" /><path d="M48 68h24v13H48zM92 53h13M101 48v10M39 90v7M81 90v7" /></>,
    goshuin: <><rect x="46" y="28" width="50" height="62" rx="4" /><circle cx="71" cy="58" r="14" /><path d="M63 58h16M71 50v16M18 37h38M25 27h24M29 16h16M23 37v49M51 37v49M16 49h42" /></>,
    vending: <><rect x="30" y="8" width="61" height="86" rx="7" /><rect x="38" y="17" width="45" height="37" rx="3" /><path d="M42 25h37M42 36h37M42 47h37M51 20v31M69 20v31" /><rect x="40" y="64" width="26" height="15" rx="2" /><circle cx="79" cy="68" r="4" /><path d="M73 80h11M37 94v5M84 94v5" /></>,
    figures: <><path d="m46 27 3-13 8 6 5-11 6 11 9-5-3 14" /><circle cx="61" cy="31" r="13" /><path d="M51 44 45 69h31l-6-25M48 49 35 65M73 49l13 16M52 69 43 86M69 69l10 17M34 88h54" /><ellipse cx="61" cy="92" rx="35" ry="7" /></>,
  }

  return <svg className="trip-counter-art" viewBox="0 0 120 105" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[id]}</svg>
}

function TripCounterCard({ definition, editable, onAdd }: { definition: TripCounterDefinition; editable: boolean; onAdd: () => void }) {
  const [burst, setBurst] = useState(0)

  const addOne = () => {
    if (!editable) return
    setBurst((current) => current + 1)
    onAdd()
  }

  return (
    <button type="button" className={`trip-counter-card counter-${definition.id}${definition.wide ? ' is-shinkansen' : ''}`} disabled={!editable} onClick={addOne}>
      {definition.id === 'train' ? <span className="shinkansen-windows" aria-hidden="true" /> : <TripCounterArt id={definition.id} />}
      <span className="trip-counter-copy"><strong>{definition.title}</strong><small>{editable ? definition.actionLabel : 'Юльчона ещё не здесь'}</small></span>
      <span className="trip-counter-add"><Icon name={editable ? 'sparkles' : 'lock'} size={17} /></span>
      {burst > 0 && <i key={burst} className="trip-counter-burst">Запомнил ✦</i>}
    </button>
  )
}

function ConfirmationDialog({ request, onCancel }: { request: ConfirmationRequest; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock()

  useEffect(() => {
    cancelRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  const confirm = () => {
    const action = request.onConfirm
    onCancel()
    action()
  }

  return (
    <div className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onClick={onCancel}>
      <div className="confirmation-card" onClick={(event) => event.stopPropagation()}>
        <span className="confirmation-icon"><Icon name="quest" size={22} /></span>
        <span className="section-kicker">Кицу спрашивает</span>
        <h2 id="confirmation-title">{request.title}</h2>
        <p id="confirmation-description">{request.description}</p>
        <div className="confirmation-actions">
          <button ref={cancelRef} type="button" className="confirmation-cancel" onClick={onCancel}>Не сейчас</button>
          <button type="button" className="confirmation-accept" onClick={confirm}>{request.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function useFiveSecondHold<T extends HTMLElement>(enabled: boolean, onUnlock: () => void) {
  const holdTimer = useRef<number | undefined>(undefined)
  const holdOrigin = useRef({ x: 0, y: 0 })
  const unlockAction = useRef(onUnlock)
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    unlockAction.current = onUnlock
  }, [onUnlock])

  const cancel = () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
    holdTimer.current = undefined
    setHolding(false)
  }

  const begin = () => {
    if (!enabled || holdTimer.current !== undefined) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined
      setHolding(false)
      unlockAction.current()
    }, 5_000)
  }

  useEffect(() => () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
  }, [])

  return {
    holding,
    holdProps: {
      onPointerDown: (event: React.PointerEvent<T>) => {
        if (!event.isPrimary || event.button !== 0) return
        holdOrigin.current = { x: event.clientX, y: event.clientY }
        begin()
      },
      onPointerMove: (event: React.PointerEvent<T>) => {
        if (Math.hypot(event.clientX - holdOrigin.current.x, event.clientY - holdOrigin.current.y) > 14) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onContextMenu: (event: React.MouseEvent<T>) => event.preventDefault(),
      onBlur: cancel,
      onKeyDown: (event: React.KeyboardEvent<T>) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault()
          begin()
        }
      },
      onKeyUp: (event: React.KeyboardEvent<T>) => {
        if (event.key === ' ' || event.key === 'Enter') cancel()
      },
    },
  }
}

function useHorizontalDragScroll(activeKey: string, enabled: boolean) {
  const railRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ active: false, dragging: false, pointerId: -1, startX: 0, scrollLeft: 0 })
  const suppressClick = useRef(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const rail = railRef.current
    const active = rail?.querySelector<HTMLElement>('.day-chip.is-active')
    if (!rail || !active) return

    const targetLeft = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2
    rail.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [activeKey, enabled])

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return
    const wasDragging = dragState.current.dragging
    dragState.current.active = false
    dragState.current.dragging = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)

    if (wasDragging) {
      suppressClick.current = true
      window.setTimeout(() => { suppressClick.current = false }, 0)
    }
  }

  return {
    railRef,
    dragging,
    dragProps: {
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return
        dragState.current = {
          active: true,
          dragging: false,
          pointerId: event.pointerId,
          startX: event.clientX,
          scrollLeft: event.currentTarget.scrollLeft,
        }
      },
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
        const state = dragState.current
        if (!state.active || state.pointerId !== event.pointerId) return
        const distance = event.clientX - state.startX
        if (!state.dragging && Math.abs(distance) < 15) return
        if (!state.dragging) {
          state.dragging = true
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
        }
        event.preventDefault()
        event.currentTarget.scrollLeft = state.scrollLeft - distance
      },
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onLostPointerCapture: finishDrag,
      onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
        if (!suppressClick.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClick.current = false
      },
    },
  }
}

function JourneyDayChip({ slot, index, city, active, unlocked, claimed, editable, onSelect, onForceUnlock }: { slot: TripDay; index: number; city: string; active: boolean; unlocked: boolean; claimed: boolean; editable: boolean; onSelect: () => void; onForceUnlock: () => void }) {
  const hold = useFiveSecondHold<HTMLButtonElement>(editable && !unlocked, onForceUnlock)

  return (
    <button
      type="button"
      className={`day-chip${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}${claimed ? ' is-claimed' : ''}${hold.holding ? ' is-holding' : ''}`}
      onClick={onSelect}
      aria-label={`${slot.dateLabel}. ${unlocked ? city : editable ? 'Глава под печатью. Чтобы открыть её раньше, удерживай пять секунд.' : 'Глава пока под печатью.'}`}
      {...hold.holdProps}
    >
      <small>{index + 1}</small>
      <strong>{slot.dateLabel.replace(' октября', '').replace(' сентября', ' сен')}</strong>
      {unlocked ? <span>{claimed ? <Icon name="check" size={12} /> : city}</span> : <Icon name="lock" size={12} />}
    </button>
  )
}

function DayVibeCard({ vibe }: { vibe: DayVibe }) {
  const pace = { gentle: 1, steady: 2, adventure: 3, full: 4 }[vibe.tone]

  return (
    <section className="day-vibe-card" aria-label={`Настроение дня: ${vibe.label}`}>
      <span className="day-vibe-icon" aria-hidden="true">{vibe.icon}</span>
      <div className="day-vibe-copy">
        <div className="day-vibe-meta"><span>Темп дня · {pace} из 4</span><strong>{vibe.label}</strong></div>
        <h3>{vibe.title}</h3>
        <p>{vibe.description}</p>
        <div className="day-vibe-rule"><Icon name="sparkles" size={15} /><span>{vibe.rule}</span></div>
      </div>
      <span className="day-vibe-meter" aria-hidden="true">{[1, 2, 3, 4].map((step) => <i key={step} className={step <= pace ? 'is-on' : ''} />)}</span>
    </section>
  )
}

function JourneyTimeGuide({ guide }: { guide: NonNullable<TripDay['timeGuide']> }) {
  return (
    <section className="journey-time-guide" aria-label={guide.label}>
      <span className="journey-time-icon"><Icon name="clock" size={21} /></span>
      <div>
        <span className="section-kicker">{guide.label}</span>
        <h3>{guide.title}</h3>
        <p>{guide.description}</p>
      </div>
    </section>
  )
}

function FromsoftQuestCard({ stage, relic, editable, onFind }: { stage: 'akihabara' | 'nakano'; relic: FromsoftRelic | null; editable: boolean; onFind: (relic: FromsoftRelic) => void }) {
  const foundDarkSouls = relic === 'dark-souls'

  if (relic) {
    return (
      <div className="fromsoft-quest is-kindled">
        <div className="fromsoft-quest-mark"><Icon name="sparkles" size={18} /></div>
        <div className="fromsoft-quest-copy">
          <small>Скрытая миссия · знак найден</small>
          <h3>{foundDarkSouls ? 'Костёр зажжён' : 'Благодать найдена'}</h3>
          <p>{foundDarkSouls
            ? 'Реликвия Dark Souls найдена. Кицу сохранил её искру: теперь она позволит один раз изменить неверный ответ в загадке дня.'
            : 'Знак Elden Ring найден. Кицу сохранил золотую искру: теперь она позволит один раз изменить неверный ответ в загадке дня.'}</p>
        </div>
        <span className="fromsoft-found"><Icon name="check" size={15} /> {foundDarkSouls ? 'Dark Souls' : 'Elden Ring'}</span>
      </div>
    )
  }

  const isNakano = stage === 'nakano'
  return (
    <div className="fromsoft-quest">
      <div className="fromsoft-quest-mark"><Icon name="sparkles" size={18} /></div>
      <div className="fromsoft-quest-copy">
        <small>Скрытая миссия · FromSoftware</small>
        <h3>{isNakano ? 'Искра ещё тлеет' : 'Путь негорящей искры'}</h3>
        <p>{isNakano
          ? 'Если в Akihabara ничего не выпало, Nakano Broadway даёт вторую попытку. Ищи Dark Souls в первую очередь. Elden Ring можно считать редким запасным знаком.'
          : 'Среди витрин ищи сначала что-нибудь из Dark Souls. Если город подкинет Elden Ring, это тоже считается знаком.'}</p>
        <p className="fromsoft-rule">Подойдёт фигурка, артбук, брелок, коробка игры или просто редкая вещь в витрине. Покупать необязательно. Фотография тоже считается.</p>
      </div>
      <div className="fromsoft-actions" aria-label="Отметить найденную реликвию">
        <button type="button" disabled={!editable} onClick={() => onFind('dark-souls')}>{editable ? 'Нашла Dark Souls' : 'Dark Souls ещё не найден'}</button>
        <button type="button" disabled={!editable} onClick={() => onFind('elden-ring')}>{editable ? 'Нашла Elden Ring' : 'Elden Ring ещё не найден'}</button>
      </div>
    </div>
  )
}

function TimelineCard({ item, complete, locked, editable, fromsoftRelic, onToggle, onForceUnlock, onFindFromsoftRelic }: { item: TimelineItem; complete: boolean; locked: boolean; editable: boolean; fromsoftRelic: FromsoftRelic | null; onToggle: () => void; onForceUnlock: () => void; onFindFromsoftRelic: (relic: FromsoftRelic) => void }) {
  const holdTimer = useRef<number | undefined>(undefined)
  const holdOrigin = useRef({ x: 0, y: 0 })
  const [holding, setHolding] = useState(false)
  const guides = sceneGuides[item.id] ?? []
  const animeFrames = animeFrameGuides[item.id] ?? []

  const cancelUnlockHold = () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
    holdTimer.current = undefined
    setHolding(false)
  }

  const beginUnlockHold = () => {
    if (!editable || !locked || holdTimer.current !== undefined) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined
      setHolding(false)
      onForceUnlock()
    }, 5_000)
  }

  useEffect(() => () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
  }, [])

  if (locked) {
    return (
      <div
        className={`timeline-card is-locked${holding ? ' is-holding' : ''}`}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={`${item.time}. ${item.title}. Юльчона ещё не здесь. Этот момент пока под печатью.${editable ? ' Чтобы открыть его раньше, удерживай пять секунд.' : ''}`}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          holdOrigin.current = { x: event.clientX, y: event.clientY }
          beginUnlockHold()
        }}
        onPointerMove={(event) => {
          if (Math.hypot(event.clientX - holdOrigin.current.x, event.clientY - holdOrigin.current.y) > 14) cancelUnlockHold()
        }}
        onPointerUp={cancelUnlockHold}
        onPointerCancel={cancelUnlockHold}
        onPointerLeave={cancelUnlockHold}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault()
            beginUnlockHold()
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') cancelUnlockHold()
        }}
      >
        <div className="timeline-locked-row">
          <span className="stop-check"><Icon name="lock" size={14} /></span>
          <span className={`kind-icon kind-${item.kind}`}><Icon name={item.kind} size={18} /></span>
          <span className="timeline-title">
            <small>{item.time}</small>
            <strong>{item.title}</strong>
            <span className="timeline-lock-note">{holding ? 'Не отпускай · Кицу снимает печать…' : 'Юльчона ещё не здесь'}</span>
          </span>
          <span className="details-chevron"><Icon name="lock" size={15} /></span>
        </div>
      </div>
    )
  }

  return (
    <details className={complete ? 'timeline-card is-complete' : 'timeline-card'}>
      <summary>
        <button className="stop-check" type="button" disabled={!editable} aria-label={complete ? 'Убрать отметку о прохождении' : 'Отметить момент как пройденный'} onClick={(event) => { event.preventDefault(); onToggle() }}>{complete && <Icon name="check" size={17} />}</button>
        <span className={`kind-icon kind-${item.kind}`}><Icon name={item.kind} size={18} /></span>
        <span className="timeline-title"><small>{item.time}</small><strong>{item.title}</strong></span>
        <span className="details-chevron"><Icon name="chevron" size={18} /></span>
      </summary>
      <div className="timeline-details">
        {item.food && <FoodChoiceBlock plan={item.food} />}
        {item.details.map((detail, index) => (
          <div className="timeline-detail" key={`${index}-${detail}`}>
            <span className="timeline-detail-label">{getTimelineDetailLabel(item, detail, index)}</span>
            <p>{detail}</p>
          </div>
        ))}
        {guides.map((guide) => (
          <div className="timeline-detail timeline-guide" key={`${guide.label}-${guide.text}`}>
            <span className="timeline-detail-label">{guide.label}</span>
            <p>{guide.text}</p>
          </div>
        ))}
        {animeFrames.map((frame) => <AnimeFrameCard key={`${item.id}-${frame.work}`} frame={frame} />)}
        {item.id === 'akihabara' && <FromsoftQuestCard stage="akihabara" relic={fromsoftRelic} editable={editable} onFind={onFindFromsoftRelic} />}
        {item.id === 'nakano' && <FromsoftQuestCard stage="nakano" relic={fromsoftRelic} editable={editable} onFind={onFindFromsoftRelic} />}
      </div>
    </details>
  )
}

function FoodChoiceBlock({ plan }: { plan: FoodPlan }) {
  const icon = plan.meal.includes('Матча') ? '🍵' : plan.meal.includes('Завтрак') ? '🍳' : plan.meal.includes('Перекус') ? '🥢' : plan.meal.includes('Ужин') ? '🍽️' : '🍜'

  if (plan.mode === 'mood') {
    return (
      <section className="food-choice-block food-choice-mood" aria-label={`${plan.meal}: выбрать по настроению`}>
        <span className="food-choice-meal">{icon} {plan.meal}</span>
        <span className="food-choice-status">Выбираем по настроению</span>
        <div className="food-mood-options">
          {plan.choices.map((choice) => (
            <article className="food-mood-option" key={choice.name}>
              <strong>{choice.name}</strong>
              <p>{choice.note}</p>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (plan.mode === 'free') {
    return (
      <section className="food-choice-block food-choice-free" aria-label={`${plan.meal}: выбрать по месту`}>
        <span className="food-choice-meal">{icon} {plan.meal}</span>
        <span className="food-choice-status">Выбираем по месту</span>
        {plan.area && <span className="food-choice-area">📍 {plan.area}</span>}
        <p className="food-choice-note">{plan.note}</p>
        <FoodAlternatives alternatives={plan.alternatives} label="Если захочется" />
      </section>
    )
  }

  return (
    <section className="food-choice-block food-choice-primary" aria-label={`${plan.meal}: наш выбор`}>
      <span className="food-choice-meal">{icon} {plan.meal}</span>
      <span className="food-choice-status">⭐ Наш выбор</span>
      <strong className="food-choice-name">{plan.primary.name}</strong>
      <p className="food-choice-note">{plan.primary.note}</p>
      <FoodAlternatives alternatives={plan.alternatives} fallback={plan.alternatives?.length ? undefined : plan.fallback} />
    </section>
  )
}

function FoodAlternatives({ alternatives, fallback, label = 'Другие хорошие варианты' }: { alternatives?: FoodOption[]; fallback?: string; label?: string }) {
  if (!alternatives?.length && !fallback) return null
  const summaryLabel = alternatives?.length ? label : 'Можно выбрать другое'

  return (
    <details className="food-alternatives">
      <summary>
        <span>{summaryLabel}</span>
        <Icon name="chevron" size={15} />
      </summary>
      <div className="food-alternatives-list">
        {alternatives?.map((option) => (
          <article className="food-alternative" key={option.name}>
            <strong>{option.name}</strong>
            <p>{option.note}</p>
          </article>
        ))}
        {fallback && <p className="food-alternatives-fallback">{fallback}</p>}
      </div>
    </details>
  )
}

function AnimeFrameCard({ frame }: { frame: AnimeFrameGuide }) {
  const [enlarged, setEnlarged] = useState(false)
  useBodyScrollLock(enlarged)

  useEffect(() => {
    if (!enlarged) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEnlarged(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [enlarged])

  return (
    <div className="anime-frame-card">
      <div className="anime-frame-heading">
        <span><Icon name="eye" size={16} /></span>
        <div><small>Кадр из аниме</small><strong>{frame.work}</strong></div>
      </div>
      <button type="button" className="anime-frame-image" onClick={() => setEnlarged(true)} aria-label={`Увеличить: ${frame.moment}`}>
        <img src={frame.image} alt={frame.alt} loading="lazy" />
        <span><Icon name="camera" size={15} /> Нажми, чтобы увеличить</span>
      </button>
      <div className="anime-frame-copy"><strong>{frame.moment}</strong><p>{frame.shot}</p></div>
      {enlarged && (
        <div className="anime-frame-lightbox" role="dialog" aria-modal="true" aria-label={frame.moment} onClick={() => setEnlarged(false)}>
          <button type="button" aria-label="Закрыть увеличенный кадр" onClick={() => setEnlarged(false)}>×</button>
          <img src={frame.image} alt={frame.alt} onClick={(event) => event.stopPropagation()} />
          <strong>{frame.work} · {frame.moment}</strong>
        </div>
      )}
    </div>
  )
}

function DayMapCard({ day, completedStops }: { day: TripDay; completedStops: string[] }) {
  const [open, setOpen] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const mapUrl = day.mapFile ? `/japan_daily_maps_mobile/${day.mapFile}` : ''
  const minimumProgress = day.mapStartProgress ?? 0
  const mapDate = encodeURIComponent(day.dateLabel)
  const completedQuery = encodeURIComponent(JSON.stringify(completedStops))
  const routeScenesQuery = encodeURIComponent(JSON.stringify(day.mapRouteScenes ?? []))

  const sendMapProgress = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({
      type: 'chonchetrip-map-progress',
      dayId: day.id,
      completedSceneIds: completedStops,
      routeScenes: day.mapRouteScenes ?? [],
      minimumSteps: minimumProgress,
    }, window.location.origin)
  }, [completedStops, day.id, day.mapRouteScenes, minimumProgress])

  useEffect(() => {
    if (open) sendMapProgress()
  }, [open, sendMapProgress])

  if (!day.mapFile) return null

  return (
    <section className={open ? 'day-map-card is-open' : 'day-map-card'}>
      <button type="button" className="day-map-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="day-map-icon"><Icon name="route" size={21} /></span>
        <span><small>Маршрут дня</small><strong>Интерактивная карта</strong></span>
        <Icon name="chevron" size={19} />
      </button>
      {open && (
        <div className="day-map-body">
          {day.mapNote && <p className="day-map-note"><Icon name="hint" size={16} /> {day.mapNote}</p>}
          <div className="day-map-frame"><iframe ref={frameRef} src={`${mapUrl}?embed=1&date=${mapDate}`} title={`Карта пути · ${day.dateLabel}`} loading="lazy" allow="geolocation" onLoad={sendMapProgress} /></div>
          <div className="day-map-footer"><span>Серое — пройденный путь, золотое — текущая цель. Светится только маршрут от последней точки к текущей; будущие точки остаются цветными. Кнопка 📍 покажет, где ты.</span><a href={`${mapUrl}?date=${mapDate}&completed=${completedQuery}&routeScenes=${routeScenesQuery}&minimum=${minimumProgress}`} target="_blank" rel="noopener noreferrer">Развернуть карту →</a></div>
        </div>
      )}
    </section>
  )
}

function TransitMapsSection() {
  const [expandedMap, setExpandedMap] = useState<(typeof transitMaps)[number] | null>(null)
  useBodyScrollLock(Boolean(expandedMap))

  useEffect(() => {
    if (!expandedMap) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedMap(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expandedMap])

  return (
    <>
      <section id="kitsu-metro" className="transit-maps-section kitsu-anchor-section">
        <div className="section-title">
          <div><span className="section-kicker">Не потеряться в линиях</span><h2>Карты метро</h2></div>
          <Icon name="route" size={19} />
        </div>
        <div className="transit-map-grid">
          {transitMaps.map((metroMap) => (
            <details key={metroMap.id} className={`transit-map-card city-${metroMap.id}`}>
              <summary className="transit-map-summary">
                <span className="transit-map-city">
                  <span><small>{metroMap.operator}</small><strong>{metroMap.city}</strong></span>
                  <i lang="ja">{metroMap.localName}</i>
                </span>
                <span className="transit-summary-home">{metroMap.homeSummary}</span>
                <span className="transit-summary-action"><span className="when-closed">Показать карту</span><span className="when-open">Свернуть</span><Icon name="chevron" size={16} /></span>
              </summary>
              <div className="transit-map-body">
                <div className="transit-home">
                  <span className="transit-home-icon"><Icon name="rest" size={18} /></span>
                  <span><small>Где мы живём</small><strong>{metroMap.home}</strong><em>{metroMap.homeArea}</em></span>
                </div>
                <div className="transit-home-stops">
                  {metroMap.homeStops.map((stop) => (
                    <div key={stop.name} className="transit-home-stop">
                      <small>{stop.role}</small>
                      <strong>{stop.name}</strong>
                      <span className="transit-home-lines">
                        {stop.lines.map((line) => (
                          <span key={line.code}>
                            <b style={{ '--line-color': line.color, '--line-text': line.textColor ?? '#fff' } as React.CSSProperties}>{line.code}</b>
                            <span>{line.name}</span>
                          </span>
                        ))}
                      </span>
                      <em>{stop.note}</em>
                    </div>
                  ))}
                </div>
                {metroMap.extraLineCodes.length > 0 && (
                  <div className="transit-extra-lines">
                    <small>Ещё встретятся по маршруту</small>
                    <span>{metroMap.lines.filter((line) => metroMap.extraLineCodes.includes(line.code)).map((line) => <span key={line.code}><b style={{ '--line-color': line.color, '--line-text': line.textColor ?? '#fff' } as React.CSSProperties}>{line.code}</b>{line.name}</span>)}</span>
                  </div>
                )}
                <p className="transit-map-rail-note">{metroMap.railNote}</p>
                <figure className="transit-map-preview">
                  <button type="button" onClick={() => setExpandedMap(metroMap)} aria-label={`Открыть карту ${metroMap.city} на весь экран`}><img src={metroMap.mapImage} alt={metroMap.mapAlt} loading="lazy" decoding="async" /></button>
                  <figcaption>Карта сохранена в офлайн-пакете. Тапни по ней, чтобы открыть на весь экран.</figcaption>
                </figure>
              </div>
            </details>
          ))}
        </div>
      </section>
      {expandedMap && (
        <div className="transit-map-lightbox" role="dialog" aria-modal="true" aria-label={`Карта ${expandedMap.city} на весь экран`} onClick={() => setExpandedMap(null)}>
          <div className="transit-map-lightbox-head">
            <span><small>{expandedMap.operator}</small><strong>{expandedMap.city}</strong></span>
            <button type="button" autoFocus onClick={() => setExpandedMap(null)} aria-label="Закрыть полноэкранную карту">×</button>
          </div>
          <div className="transit-map-lightbox-stage" onClick={(event) => event.stopPropagation()}>
            <img src={expandedMap.mapImage} alt={expandedMap.mapAlt} />
          </div>
          <small className="transit-map-lightbox-hint">Увеличивай двумя пальцами · нажми на тёмный фон, чтобы закрыть</small>
        </div>
      )}
    </>
  )
}

function LockedDayContent({ editable, timingLabel, timingDescription, onForceUnlock }: { editable: boolean; timingLabel: string; timingDescription: string; onForceUnlock: () => void }) {
  const holdTimer = useRef<number | undefined>(undefined)
  const holdOrigin = useRef({ x: 0, y: 0 })
  const [holding, setHolding] = useState(false)

  const cancelUnlockHold = () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
    holdTimer.current = undefined
    setHolding(false)
  }

  const beginUnlockHold = () => {
    if (!editable || holdTimer.current !== undefined) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined
      setHolding(false)
      onForceUnlock()
    }, 5_000)
  }

  useEffect(() => () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current)
  }, [])

  return (
    <div
      className={`screen-content locked-content emergency-day-unlock${holding ? ' is-holding' : ''}`}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? 'Глава пока под печатью. Чтобы открыть её раньше, удерживай пять секунд.' : 'Глава пока под печатью.'}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return
        holdOrigin.current = { x: event.clientX, y: event.clientY }
        beginUnlockHold()
      }}
      onPointerMove={(event) => {
        if (Math.hypot(event.clientX - holdOrigin.current.x, event.clientY - holdOrigin.current.y) > 14) cancelUnlockHold()
      }}
      onPointerUp={cancelUnlockHold}
      onPointerCancel={cancelUnlockHold}
      onPointerLeave={cancelUnlockHold}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault()
          beginUnlockHold()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') cancelUnlockHold()
      }}
    >
      <img src="/assets/kitsune-guide.webp" alt="Кицу, проводник путешествия" draggable="false" />
      <span className="section-kicker">{timingLabel}</span>
      <h2>{holding ? 'Кицу снимает печать…' : 'Кицу хранит секрет'}</h2>
      <p>{holding ? 'Не отпускай. Печать исчезнет через пять секунд.' : timingDescription}</p>
      <div className="locked-note"><Icon name="sparkles" size={18} /><span>Коллекцию можно листать заранее, но будущие награды всё равно останутся тайной.</span></div>
    </div>
  )
}

type OfflineTravelDialogProps = {
  networkOnline: boolean
  standaloneApp: boolean
  packStatus: OfflinePackStatus
  completed: number
  total: number
  pendingChanges: boolean
  pendingPhotos: number
  error: string
  onDownload: () => void
  onClose: () => void
}

function OfflineTravelDialog({
  networkOnline,
  standaloneApp,
  packStatus,
  completed,
  total,
  pendingChanges,
  pendingPhotos,
  error,
  onDownload,
  onClose,
}: OfflineTravelDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const downloading = packStatus === 'downloading'
  const ready = packStatus === 'ready'
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  useBodyScrollLock()

  useEffect(() => {
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !downloading) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [downloading, onClose])

  return (
    <div className="offline-dialog" role="dialog" aria-modal="true" aria-labelledby="offline-dialog-title" onClick={() => { if (!downloading) onClose() }}>
      <section className="offline-card" onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="offline-close" type="button" aria-label="Закрыть" disabled={downloading} onClick={onClose}>×</button>
        <span className="offline-kicker">Дорога без сигнала</span>
        <div className={ready ? 'offline-emblem is-ready' : 'offline-emblem'}><Icon name={ready ? 'check' : 'download'} size={27} /></div>
        <h2 id="offline-dialog-title">{ready ? 'Поездка сохранена на iPhone' : 'Скачать поездку офлайн'}</h2>
        <p>{ready
          ? 'Главы, иллюстрации и маршруты откроются без интернета. Просмотренные фрагменты карты тоже останутся в памяти телефона.'
          : 'Один раз скачай пакет по Wi‑Fi. После этого дневник продолжит работать в метро, поезде и при слабой связи.'}</p>

        <div className="offline-status-list">
          <span><i className={networkOnline ? 'is-ok' : 'is-waiting'} />Сеть<strong>{networkOnline ? 'есть' : 'нет сигнала'}</strong></span>
          <span><i className={ready ? 'is-ok' : 'is-waiting'} />Офлайн-пакет<strong>{ready ? 'готов' : downloading ? `${progress}%` : 'не скачан'}</strong></span>
          <span><i className={!pendingChanges && pendingPhotos === 0 ? 'is-ok' : 'is-waiting'} />Синхронизация<strong>{pendingChanges || pendingPhotos > 0 ? `ждут: ${Number(pendingChanges) + pendingPhotos}` : 'всё сохранено'}</strong></span>
        </div>

        {downloading && <div className="offline-progress" aria-label={`Скачано ${progress}%`}><i style={{ width: `${progress}%` }} /></div>}
        {error && <p className="offline-error" role="alert">{error}</p>}
        {!standaloneApp && packStatus !== 'unsupported' && (
          <p className="offline-note">Для надёжности на iPhone сначала выбери «Поделиться» → «На экран Домой», открой Chonchetrip с новой иконки и скачай пакет уже там.</p>
        )}
        {packStatus === 'unsupported' ? (
          <p className="offline-note">Офлайн-установка появится в опубликованной HTTPS-версии. На iPhone сначала добавь её на экран «Домой», затем открой с иконки.</p>
        ) : (
          <button className="offline-download" type="button" disabled={downloading || !networkOnline} onClick={onDownload}>
            {downloading ? `Сохраняю поездку · ${progress}%` : ready ? 'Обновить офлайн-пакет' : 'Скачать по Wi‑Fi'}
          </button>
        )}
        <small>Офлайн-отметки и фото отправятся в облако сами, когда приложение снова откроется с интернетом.</small>
      </section>
    </div>
  )
}

function AccessGate({ onEnter }: { onEnter: (mode: AccessMode) => void }) {
  const [step, setStep] = useState<'choose' | 'editor'>('choose')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const enterViewer = () => onEnter('viewer')
  const enterEditor = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setChecking(true)
    try {
      await startEditorSession(answer)
      onEnter('editor')
    } catch (caught) {
      setError(caught instanceof CloudUnavailableError
        ? 'Без связи первый вход невозможен. Один раз открой дневник онлайн — дальше он будет работать офлайн.'
        : 'Кицу не узнал ответ. Попробуй ещё раз.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="access-gate">
      <div className="access-gate-shade" />
      <section className="access-gate-card" aria-labelledby="access-title">
        <img src="/assets/kitsune-guide.webp" alt="Кицу" />
        <span className="section-kicker">Chonchetrip · Japan 2026</span>
        <h1 id="access-title">Кто заглянул в эту историю?</h1>
        {step === 'choose' ? (
          <div className="access-choices">
            <button type="button" className="viewer-choice" onClick={enterViewer}>
              <Icon name="eye" size={21} />
              <span><strong>Смотреть путешествие</strong><small>История Юльчоны и Эдюши</small></span>
            </button>
            <button type="button" className="editor-choice" onClick={() => { if (PREVIEW_MODE) onEnter('editor'); else setStep('editor') }}>
              <Icon name="fox" size={21} />
              <span><strong>{PREVIEW_MODE ? 'Тестировать как Юльчона' : 'Я Юльчона'}</strong><small>{PREVIEW_MODE ? 'Изменения останутся только в preview' : 'Открыть мой полевой дневник'}</small></span>
            </button>
          </div>
        ) : (
          <form className="access-password" onSubmit={enterEditor}>
            <label htmlFor="editor-answer">Дил?</label>
            <input id="editor-answer" type="password" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="current-password" autoFocus />
            {error && <p role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={checking || answer.trim().length === 0}>{checking ? 'Кицу проверяет…' : 'Войти в приключение'}</button>
            <button className="text-button" type="button" onClick={() => { setStep('choose'); setError(''); setAnswer('') }}>Назад</button>
          </form>
        )}
      </section>
    </main>
  )
}

function App() {
  const journeyClock = useJourneyClock()
  const today = PREVIEW_DATE && /^2026-\d{2}-\d{2}$/.test(PREVIEW_DATE)
    ? PREVIEW_DATE
    : journeyClock.date
  const journeyHour = PREVIEW_MODE
    ? hourInTimeZone(JAPAN_TIME_ZONE)
    : journeyClock.hour
  const [progress, setProgressState] = useState<Progress>(loadProgress)
  const [accessMode, setAccessMode] = useState<AccessMode | null>(loadAccessMode)
  const [accessChecking, setAccessChecking] = useState(() => !PREVIEW_MODE && navigator.onLine && loadAccessMode() === 'editor')
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() => PREVIEW_MODE || !navigator.onLine ? 'offline' : 'checking')
  const [cloudInitialized, setCloudInitialized] = useState(false)
  const [cloudRetry, setCloudRetry] = useState(0)
  const [syncPending, setSyncPending] = useState(loadCloudPending)
  const [offlinePhotosReady, setOfflinePhotosReady] = useState(false)
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine)
  const [standaloneApp] = useState(() => window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const [offlinePanelOpen, setOfflinePanelOpen] = useState(false)
  const [offlinePackStatus, setOfflinePackStatus] = useState<OfflinePackStatus>('checking')
  const [offlinePackProgress, setOfflinePackProgress] = useState({ completed: 0, total: 0 })
  const [offlinePackError, setOfflinePackError] = useState('')
  const [view, setView] = useState<ViewName>('journey')
  const latestUnlocked = [...tripDays].reverse().find((day) => day.date <= today)
  const [selectedDate, setSelectedDate] = useState(latestUnlocked?.date ?? tripDays[0].date)
  const [modal, setModal] = useState<{ id: string; isNew: boolean; queue: string[] } | null>(null)
  const [magicModalDayId, setMagicModalDayId] = useState<string | null>(null)
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null)
  const [kitsuReaction, setKitsuReaction] = useState<{ id: number; message: string } | null>(null)
  const [ambientVisit, setAmbientVisit] = useState<AmbientVisit | null>(null)
  const [pawBurst, setPawBurst] = useState<PawBurst | null>(null)
  const [foxFireFlight, setFoxFireFlight] = useState<FoxFireFlight | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null)
  const [photoError, setPhotoError] = useState('')
  const progressRef = useRef(progress)
  const lastCloudSnapshot = useRef(loadCloudSnapshot())
  const pendingSyncRef = useRef(syncPending)
  const activePhotoUploads = useRef(new Set<string>())
  const durablePendingPhotoIds = useRef(new Set<string>())

  const markCloudPending = useCallback(() => {
    if (PREVIEW_MODE) return
    pendingSyncRef.current = true
    setSyncPending(true)
    saveCloudPending(true)
  }, [])

  const clearCloudPending = useCallback(() => {
    pendingSyncRef.current = false
    setSyncPending(false)
    saveCloudPending(false)
  }, [])

  const setProgress = useCallback((action: SetStateAction<Progress>) => {
    if (accessMode === 'editor') markCloudPending()
    setProgressState(action)
  }, [accessMode, markCloudPending])

  const canEdit = accessMode === 'editor'
  const pendingPhotoCount = Object.values(progress.photos).filter((photo) => photo.startsWith('data:image/')).length
  const {
    railRef: dayRailRef,
    dragging: dayRailDragging,
    dragProps: dayRailDragProps,
  } = useHorizontalDragScroll(selectedDate, view === 'journey' && Boolean(accessMode) && !accessChecking)
  const selectedDay = dayContentForDate(selectedDate)
  const selectedUnlockTiming = selectedDay.id === 'belgrade-dubai'
    ? {
        label: 'Время Сербии',
        hero: 'в 00:00 по Сербии',
        description: 'Пролог просыпается 29 сентября в полночь по Сербии. До вылета в Osaka приложение остаётся на домашних часах.',
      }
    : selectedDay.id === 'arrival-osaka'
      ? {
          label: 'Переход на время Японии',
          hero: 'при переводе часов на Японию',
          description: 'Глава Osaka откроется при вылете из Dubai: 01:00 по Сербии и 03:00 по Dubai превращаются в 08:00 по Японии.',
        }
      : {
          label: 'Время Японии',
          hero: 'в 00:00 по Японии',
          description: 'После перелёта каждая глава просыпается в полночь по японскому времени. До этого маршрут и награда остаются под печатью.',
        }
  const selectedMagic = kitsuMagicByDay[selectedDay.id]
  const selectedUnlocked = selectedDate <= today || progress.unlockedDays.includes(selectedDate)
  const selectedAchievement = selectedDay.achievementId
    ? achievements.find((item) => item.id === selectedDay.achievementId)
    : undefined
  const modalAchievement = modal ? achievements.find((item) => item.id === modal.id) : undefined
  const selectedStops = progress.checkedStops[selectedDay.id] ?? []
  const selectedUnlockedStops = progress.unlockedStops[selectedDay.id] ?? []
  const selectedAfternoonUnlocked = selectedDate < today || (selectedDate === today && journeyHour >= 13)
  const selectedEveningUnlocked = selectedDate < today || (selectedDate === today && journeyHour >= 19)
  const selectedClaimed = selectedDay.achievementId
    ? progress.claimed.includes(selectedDay.achievementId)
    : false
  const selectedSceneIds = [...new Set(selectedDay.timeline.map((item) => item.id))]
  const selectedCompletedSceneCount = selectedSceneIds.filter((id) => selectedStops.includes(id)).length
  const selectedRiddleUnlocked = selectedSceneIds.every((id) => selectedStops.includes(id))
  const solvedRiddles = progress.solvedRiddles ?? []
  const selectedRiddleSolved = solvedRiddles.includes(selectedDay.id)
  const selectedRiddleRevealed = progress.reveals.includes(selectedDay.id)
  const selectedHintUsed = progress.hints.includes(selectedDay.id)
  const selectedAnswer = progress.riddleAnswers[selectedDay.id]
    ?? (selectedRiddleSolved ? selectedDay.riddle.answer : undefined)
  const isCorrect = selectedAnswer === selectedDay.riddle.answer
  const selectedAnswerLocked = selectedAnswer !== undefined && !selectedRiddleSolved
  const selectedEmberAvailable = canEdit
    && selectedRiddleUnlocked
    && selectedAnswerLocked
    && !isCorrect
    && Boolean(progress.fromsoftRelic)
    && !progress.fromsoftEmberUsedAt
  const rating = progress.ratings[selectedDay.id]
  const selectedDaySteps = progress.dailySteps[selectedDay.id] ?? ''
  const discoveredCount = achievements.filter((achievement) => progress.claimed.includes(achievement.id)).length
  const completedSideQuests = progress.sideQuests ?? []
  const previewMode = PREVIEW_MODE
  const previewDateLabel = tripDays.find((slot) => slot.date === today)?.dateLabel ?? today
  const knownFoxFires = progress.foxFires.filter((id) => Boolean(kitsuMagicByDay[id]))
  const nightMagicDays = kitsuMagicDays.filter((magic) => Boolean(magic.nightEncounter))
  const knownKitsuEncounters = progress.kitsuEncounters.filter((id) => nightMagicDays.some((magic) => magic.dayId === id))
  const tripCounters = progress.tripCounters ?? emptyTripCounters
  const selectedFoxFireFound = selectedMagic ? knownFoxFires.includes(selectedMagic.dayId) : false
  const selectedEncounterFound = selectedMagic ? progress.kitsuEncounters.includes(selectedMagic.dayId) : false
  const selectedNightMagicUnlocked = PREVIEW_MODE || selectedDate < today || (selectedDate === today && journeyHour >= 19)
  const magicModal = magicModalDayId ? kitsuMagicByDay[magicModalDayId] : undefined
  const activeLetter = activeLetterId ? sealedLetters.find((letter) => letter.id === activeLetterId) : undefined
  const ambientEffectsPaused = Boolean(modal || magicModal || activeLetter || confirmation || offlinePanelOpen)
  const kitsuMood = journeyHour < 10 ? 'sleepy' : journeyHour < 18 ? 'adventurous' : 'cozy'
  const kitsuMoodLabel = kitsuMood === 'sleepy' ? 'сонная проводница' : kitsuMood === 'adventurous' ? 'охотница за знаками' : 'хранительница вечерних огней'
  const kitsuStages = [
    { min: 0, title: 'Спящий дух', subtitle: 'Первый огонь ещё ждёт впереди' },
    { min: 1, title: 'Искра пути', subtitle: 'Кицу проснулся и идёт рядом' },
    { min: 3, title: 'Следопыт', subtitle: 'Лисьи следы становятся ярче' },
    { min: 6, title: 'Хранитель фонарей', subtitle: 'У Кицу появилась собственная маленькая стая огней' },
    { min: 10, title: 'Дух трёх городов', subtitle: 'Osaka, Kyoto и Tokyo узнают его шаги' },
    { min: 15, title: 'Хранитель всей истории', subtitle: 'Все огни сложились в одно созвездие' },
  ]
  const kitsuStage = [...kitsuStages].reverse().find((stage) => knownFoxFires.length >= stage.min) ?? kitsuStages[0]
  const visibleTailCount = Math.min(9, Math.max(1, Math.ceil(knownFoxFires.length / 2)))
  const finaleReady = PREVIEW_MODE || today >= '2026-10-13' || progress.unlockedDays.includes('2026-10-13')
  const fromsoftQuestAvailable = PREVIEW_MODE || today >= '2026-10-10' || progress.unlockedDays.includes('2026-10-10')
  const bestRatingEntry = Object.entries(progress.ratings).sort(([, a], [, b]) => b - a)[0]
  const bestRatedDay = bestRatingEntry ? tripDays.find((slot) => dayContentForDate(slot.date).id === bestRatingEntry[0]) : undefined
  const tripRatingValues = Object.values(progress.ratings).filter((value) => Number.isFinite(value) && value >= 1 && value <= 10)
  const tripRatingDaysLabel = tripRatingValues.length === 1
    ? 'по одному прожитому дню'
    : `по ${tripRatingValues.length} прожитым дням`
  const averageTripRating = tripRatingValues.length > 0
    ? tripRatingValues.reduce((sum, value) => sum + value, 0) / tripRatingValues.length
    : null
  const averageTripRatingLabel = averageTripRating?.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const tripCounterTotal = Object.values(tripCounters).reduce((sum, value) => sum + value, 0)
  const totalSteps = Object.values(progress.dailySteps).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    let cancelled = false
    const hydratePendingPhotos = async () => {
      try {
        const legacyPhotos = Object.entries(progressRef.current.photos)
          .filter(([, photo]) => photo.startsWith('data:image/'))
        await Promise.all(legacyPhotos.map(async ([dayId, photo]) => {
          await savePendingPhoto(dayId, photo)
          durablePendingPhotoIds.current.add(dayId)
        }))
        const pendingPhotos = await loadPendingPhotos()
        if (cancelled) return
        Object.keys(pendingPhotos).forEach((dayId) => durablePendingPhotoIds.current.add(dayId))
        if (Object.keys(pendingPhotos).length > 0) {
          setProgressState((current) => ({ ...current, photos: { ...current.photos, ...pendingPhotos } }))
        }
      } catch {
        // Legacy localStorage photos remain available if IndexedDB is blocked.
      } finally {
        if (!cancelled) setOfflinePhotosReady(true)
      }
    }
    void hydratePendingPhotos()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const updateNetworkState = () => {
      const online = navigator.onLine
      setNetworkOnline(online)
      if (!online && !PREVIEW_MODE && accessMode) setCloudStatus('offline')
      if (online) setCloudRetry((value) => value + 1)
    }
    window.addEventListener('online', updateNetworkState)
    window.addEventListener('offline', updateNetworkState)
    return () => {
      window.removeEventListener('online', updateNetworkState)
      window.removeEventListener('offline', updateNetworkState)
    }
  }, [accessMode])

  useEffect(() => {
    let cancelled = false
    void readOfflinePackStatus()
      .then((status) => {
        if (cancelled) return
        setOfflinePackProgress({ completed: status.completed, total: status.total })
        setOfflinePackStatus(status.supported ? status.ready ? 'ready' : 'available' : 'unsupported')
      })
      .catch(() => {
        if (!cancelled) setOfflinePackStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!kitsuReaction) return
    const timer = window.setTimeout(() => setKitsuReaction((current) => current?.id === kitsuReaction.id ? null : current), 4_800)
    return () => window.clearTimeout(timer)
  }, [kitsuReaction])

  useEffect(() => {
    if (!accessMode || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let visitTimer: number | undefined
    let hideTimer: number | undefined
    let visitIndex = PREVIEW_MODE ? 0 : Math.floor(Math.random() * 3)

    const clearTimers = () => {
      if (visitTimer !== undefined) window.clearTimeout(visitTimer)
      if (hideTimer !== undefined) window.clearTimeout(hideTimer)
      visitTimer = undefined
      hideTimer = undefined
    }

    const scheduleVisit = (soon = false) => {
      const delay = PREVIEW_MODE
        ? 7_000 + Math.random() * 3_000
        : soon
          ? 12_000 + Math.random() * 6_000
          : 55_000 + Math.random() * 35_000
      visitTimer = window.setTimeout(() => {
        if (document.visibilityState !== 'visible') return
        const hour = getJourneyClock().hour
        const night = hour >= 19 || hour < 5
        const visitKinds: AmbientVisit['kind'][] = PREVIEW_MODE
          ? ['paws', 'eyes', 'tail']
          : night
            ? ['eyes', 'tail', 'paws']
            : ['tail', 'paws', 'eyes']
        const visitKind = visitKinds[visitIndex % visitKinds.length]
        const visitSide = PREVIEW_MODE
          ? visitIndex % 2 === 0 ? 'right' : 'left'
          : Math.random() < 0.5 ? 'left' : 'right'
        const pawPath = PREVIEW_MODE
          ? pawPathOrder[visitIndex % pawPathOrder.length]
          : pawPathOrder[Math.floor(Math.random() * pawPathOrder.length)]
        const visitId = Date.now()
        visitIndex += 1
        setAmbientVisit({
          id: visitId,
          kind: visitKind,
          side: visitSide,
        })
        if (visitKind === 'paws') setPawBurst({ id: visitId, path: pawPath })
        hideTimer = window.setTimeout(() => {
          setAmbientVisit(null)
          scheduleVisit()
        }, visitKind === 'eyes' ? 4_500 : 4_000)
      }, delay)
    }

    const syncVisibility = () => {
      clearTimers()
      setAmbientVisit(null)
      setPawBurst(null)
      if (document.visibilityState === 'visible') scheduleVisit(true)
    }

    if (document.visibilityState === 'visible') scheduleVisit(true)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      clearTimers()
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [accessMode])

  useEffect(() => {
    try {
      const localProgress = {
        ...progress,
        photos: Object.fromEntries(Object.entries(progress.photos).filter(([dayId, photo]) => (
          !photo.startsWith('data:image/') || !durablePendingPhotoIds.current.has(dayId)
        ))),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localProgress))
    } catch {
      // The photo handler surfaces storage errors where the user can act on them.
    }
  }, [progress])

  useEffect(() => {
    if (accessMode !== 'editor') return
    if (PREVIEW_MODE) return
    if (!networkOnline) return

    let cancelled = false
    void checkEditorSession()
      .then((session) => {
        if (cancelled || session.editor) return
        forgetAccessMode()
        setAccessMode(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setCloudStatus(error instanceof CloudUnavailableError ? 'offline' : 'error')
      })
      .finally(() => {
        if (!cancelled) setAccessChecking(false)
      })

    return () => { cancelled = true }
  }, [accessMode, cloudRetry, networkOnline])

  useEffect(() => {
    if (!accessMode || accessChecking || !offlinePhotosReady) return
    if (PREVIEW_MODE) return
    let cancelled = false
    let interval: number | undefined

    const pullProgress = async (initial: boolean) => {
      if (initial) {
        setCloudInitialized(false)
        setCloudStatus('checking')
      }
      try {
        const result = await loadSharedProgress()
        if (cancelled) return
        const rememberCloudSnapshot = (snapshot: string) => {
          lastCloudSnapshot.current = snapshot
          saveCloudSnapshot(snapshot)
        }
        if (result.progress) {
          const remoteProgress = normalizeProgress(result.progress)
          const remoteSnapshot = JSON.stringify(progressForCloud(remoteProgress))
          if (accessMode === 'viewer') {
            rememberCloudSnapshot(remoteSnapshot)
            progressRef.current = remoteProgress
            setProgressState(remoteProgress)
          } else if (initial) {
            const localProgress = progressRef.current
            const localSnapshot = JSON.stringify(progressForCloud(localProgress))
            const hasPendingLocalChanges = shouldKeepLocalProgress(
              localSnapshot,
              lastCloudSnapshot.current,
              JSON.stringify(progressForCloud(emptyProgress)),
              pendingSyncRef.current,
            )
            const pendingPhotos = Object.fromEntries(
              Object.entries(localProgress.photos).filter(([, photo]) => photo.startsWith('data:image/')),
            )
            const nextProgress = hasPendingLocalChanges
              ? { ...localProgress, photos: { ...remoteProgress.photos, ...pendingPhotos } }
              : { ...remoteProgress, photos: { ...remoteProgress.photos, ...pendingPhotos } }

            if (!hasPendingLocalChanges) rememberCloudSnapshot(remoteSnapshot)
            progressRef.current = nextProgress
            setProgressState(nextProgress)
          }
        } else if (accessMode === 'editor' && initial) {
          const localProgress = progressRef.current
          const snapshot = JSON.stringify(progressForCloud(localProgress))
          await saveSharedProgress(progressForCloud(localProgress))
          if (cancelled) return
          rememberCloudSnapshot(snapshot)
          clearCloudPending()
        } else if (accessMode === 'viewer') {
          const remoteProgress = normalizeProgress(null)
          const snapshot = JSON.stringify(progressForCloud(remoteProgress))
          rememberCloudSnapshot(snapshot)
          progressRef.current = remoteProgress
          setProgressState(remoteProgress)
        }
        setCloudStatus('synced')
        setCloudInitialized(true)
      } catch (error) {
        if (cancelled) return
        if (error instanceof CloudUnavailableError) {
          setCloudStatus('offline')
          setCloudInitialized(true)
        } else {
          setCloudStatus('error')
          setCloudInitialized(false)
        }
      }
    }

    void pullProgress(true)
    if (accessMode === 'viewer') {
      interval = window.setInterval(() => void pullProgress(false), 15_000)
    }
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (accessMode === 'viewer') void pullProgress(false)
      else setCloudRetry((value) => value + 1)
    }
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [accessMode, accessChecking, clearCloudPending, cloudRetry, offlinePhotosReady])

  useEffect(() => {
    if (accessMode !== 'editor' || accessChecking || !cloudInitialized) return
    const timer = window.setTimeout(() => {
      const current = progressRef.current
      const cloudProgress = progressForCloud(current)
      const snapshot = JSON.stringify(cloudProgress)
      const pendingPhotos = Object.entries(current.photos).filter(([, photo]) => photo.startsWith('data:image/'))
      if (snapshot === lastCloudSnapshot.current && pendingPhotos.length === 0) {
        if (pendingSyncRef.current) clearCloudPending()
        return
      }

      const sync = async () => {
        setCloudStatus('checking')
        try {
          if (snapshot !== lastCloudSnapshot.current) {
            await saveSharedProgress(cloudProgress)
            lastCloudSnapshot.current = snapshot
            saveCloudSnapshot(snapshot)
            if (JSON.stringify(progressForCloud(progressRef.current)) === snapshot) clearCloudPending()
          }
          for (const [dayId, photo] of pendingPhotos) {
            if (activePhotoUploads.current.has(dayId)) continue
            activePhotoUploads.current.add(dayId)
            try {
              const url = await uploadSharedPhoto(dayId, photo)
              const latest = progressRef.current
              if (latest.photos[dayId] === photo) {
                const next = { ...latest, photos: { ...latest.photos, [dayId]: url } }
                progressRef.current = next
                setProgressState(next)
                durablePendingPhotoIds.current.delete(dayId)
                await removePendingPhoto(dayId)
              }
            } finally {
              activePhotoUploads.current.delete(dayId)
            }
          }
          setCloudStatus('synced')
        } catch (error) {
          if (error instanceof CloudSessionExpiredError) {
            forgetAccessMode()
            setAccessMode(null)
            setAccessChecking(false)
            setCloudInitialized(false)
            setCloudStatus('error')
            return
          }
          setCloudStatus(error instanceof CloudUnavailableError ? 'offline' : 'error')
        }
      }
      void sync()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [progress, accessMode, accessChecking, clearCloudPending, cloudInitialized, syncPending])

  useEffect(() => {
    if (PREVIEW_MODE || accessMode !== 'editor' || accessChecking) return
    if (cloudStatus === 'synced' && !syncPending && pendingPhotoCount === 0) return
    const interval = window.setInterval(() => setCloudRetry((value) => value + 1), 20_000)
    return () => window.clearInterval(interval)
  }, [accessMode, accessChecking, cloudStatus, pendingPhotoCount, syncPending])

  useEffect(() => {
    if (!canEdit) return
    const claimed = new Set(progress.claimed.filter((id) => currentAchievementIds.has(id)))
    const unlock = (condition: boolean, id: string) => { if (condition && !claimed.has(id)) claimed.add(id) }
    const stopDone = (dayId: string, stopId: string) => (progress.checkedStops[dayId] ?? []).includes(stopId)
    const totalRecordedSteps = Object.values(progress.dailySteps).reduce((sum, value) => sum + value, 0)
    unlock(progress.ramen, 'ramen-initiation')
    unlock(progress.konbini.length >= 3, 'konbini-connoisseur')
    unlock(progress.stamps.length >= 5, 'stamp-hunter')
    unlock(Object.values(progress.ratings).some((value) => value === 10), 'perfect-day')
    unlock(Object.keys(progress.photos).length >= 5, 'memory-keeper')
    unlock(progress.hints.length >= 5, 'curious-fox')
    unlock((progress.solvedRiddles ?? []).length >= 1, 'field-researcher')
    unlock(tripDays.filter((day) => day.riddle.location).every((day) => (progress.solvedRiddles ?? []).includes(day.id)), 'kitsus-equal')
    unlock(kitsuMagicDays.every((day) => progress.foxFires.includes(day.dayId)), 'foxfire-constellation')
    unlock((progress.sideQuests ?? []).includes('manhole-hunter'), 'manhole-hunter')
    unlock(tripCounters.gachapon > 0, 'capsule-of-fate')
    unlock((progress.sideQuests ?? []).includes('paper-fortune'), 'fortune-found')
    unlock((progress.sideQuests ?? []).length >= 5, 'wandering-legend')
    for (const rule of stopAchievementRules) {
      unlock(rule.stops.every((stopId) => stopDone(rule.dayId, stopId)), rule.achievementId)
    }
    unlock(Boolean(progress.fromsoftRelic), 'kindled-in-japan')
    unlock(totalRecordedSteps >= 100_000, 'side-by-side')
    unlock(claimed.size >= 20, 'japan-collector')
    const next = [...claimed]
    const newlyUnlocked = next.filter((id) => !progress.claimed.includes(id))
    const claimedChanged = next.length !== progress.claimed.length || next.some((id, index) => id !== progress.claimed[index])
    if (claimedChanged) {
      const timer = window.setTimeout(() => {
        setProgress((current) => ({ ...current, claimed: next }))
        if (newlyUnlocked.length > 0) {
          setModal((current) => {
            if (!current) return { id: newlyUnlocked[0], isNew: true, queue: newlyUnlocked.slice(1) }
            return { ...current, queue: [...current.queue, ...newlyUnlocked] }
          })
        }
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [progress, canEdit, setProgress, tripCounters.gachapon])

  const showKitsuReaction = (message: string) => setKitsuReaction((current) => ({ id: (current?.id ?? 0) + 1, message }))

  const findFromsoftRelic = (relic: FromsoftRelic) => {
    if (!canEdit || progress.fromsoftRelic) return
    const isDarkSouls = relic === 'dark-souls'
    setConfirmation({
      title: isDarkSouls ? 'Реликвия Dark Souls найдена?' : 'Знак Elden Ring найден?',
      description: 'Покупать ничего не нужно: вещь в витрине или фотография тоже честно зажигают эту искру.',
      confirmLabel: 'Да, искра найдена',
      onConfirm: () => {
        setProgress((current) => current.fromsoftRelic ? current : { ...current, fromsoftRelic: relic })
        showKitsuReaction(isDarkSouls
          ? 'Костёр зажёгся. Кицу унёс одну негорящую искру во вкладку своих реликвий.'
          : 'Золотой знак вспыхнул. Кицу спрятал одну искру благодати среди своих реликвий.')
      },
    })
  }

  const activateFromsoftEmber = (day: TripDay) => {
    const previousAnswer = progress.riddleAnswers[day.id]
    const allScenesComplete = day.timeline.every((item) => (progress.checkedStops[day.id] ?? []).includes(item.id))
    if (!canEdit
      || !allScenesComplete
      || !progress.fromsoftRelic
      || progress.fromsoftEmberUsedAt
      || previousAnswer === undefined
      || previousAnswer === day.riddle.answer
      || (progress.solvedRiddles ?? []).includes(day.id)) return
    setConfirmation({
      title: progress.fromsoftRelic === 'dark-souls' ? 'Разжечь костёр?' : 'Коснуться благодати?',
      description: `Искра сотрёт ответ «${day.riddle.options[previousAnswer]}» и вернёт загадке варианты. После этого она погаснет — изменить выбор так можно только один раз за всё путешествие.`,
      confirmLabel: 'Вернуть выбор',
      onConfirm: () => {
        setProgress((current) => {
          const answer = current.riddleAnswers[day.id]
          if (!current.fromsoftRelic
            || current.fromsoftEmberUsedAt
            || answer === undefined
            || answer === day.riddle.answer
            || (current.solvedRiddles ?? []).includes(day.id)) return current
          const riddleAnswers = { ...current.riddleAnswers }
          delete riddleAnswers[day.id]
          return {
            ...current,
            fromsoftEmberUsedAt: `${day.id}:riddle`,
            riddleAnswers,
            reveals: current.reveals.filter((dayId) => dayId !== day.id),
          }
        })
        showKitsuReaction('Огонь унёс неверный ответ и не потревожил ни одного воспоминания. Загадка снова ждёт твоего выбора.')
      },
    })
  }

  const isLetterUnlocked = (letter: (typeof sealedLetters)[number]) => {
    if (PREVIEW_MODE) return true
    if ('fireCount' in letter.unlock) return knownFoxFires.length >= letter.unlock.fireCount
    if (letter.unlock.stopId) return (progress.checkedStops[letter.unlock.dayId] ?? []).includes(letter.unlock.stopId)
    return knownFoxFires.includes(letter.unlock.dayId)
  }

  const findMagicSlot = (dayId: string) => tripDays.find((slot) => dayContentForDate(slot.date).id === dayId)

  const discoverFoxFire = (magic: KitsuMagicDay) => {
    if (!canEdit || progress.foxFires.includes(magic.dayId)) return
    setConfirmation({
      title: 'Лисий знак найден?',
      description: magic.clue,
      confirmLabel: magic.actionLabel,
      onConfirm: () => {
        setProgress((current) => current.foxFires.includes(magic.dayId)
          ? current
          : { ...current, foxFires: [...current.foxFires, magic.dayId] })
        setMagicModalDayId(magic.dayId)
      },
    })
  }

  const closeMagicDiscovery = () => {
    if (magicModal && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFoxFireFlight({ id: Date.now(), color: magicModal.flameColor })
    }
    setMagicModalDayId(null)
  }

  const findNightEncounter = (magic: KitsuMagicDay) => {
    if (!canEdit || !magic.nightEncounter || progress.kitsuEncounters.includes(magic.dayId)) return
    setProgress((current) => current.kitsuEncounters.includes(magic.dayId)
      ? current
      : { ...current, kitsuEncounters: [...current.kitsuEncounters, magic.dayId] })
    showKitsuReaction(magic.nightEncounter.message)
  }

  const openLetter = (letter: (typeof sealedLetters)[number]) => {
    if (!canEdit || !isLetterUnlocked(letter)) return
    const firstOpening = !progress.openedLetters.includes(letter.id)
    if (firstOpening) {
      setProgress((current) => current.openedLetters.includes(letter.id)
        ? current
        : { ...current, openedLetters: [...current.openedLetters, letter.id] })
      showKitsuReaction('Печать стала тёплой и рассыпалась золотой пылью. Письмо теперь можно перечитывать в любой момент.')
    }
    setActiveLetterId(letter.id)
  }

  const openFinale = () => {
    if (!canEdit || !finaleReady || progress.finaleOpened) return
    setProgress((current) => ({ ...current, finaleOpened: true }))
    showKitsuReaction('Все найденные огни поднялись над дневником. Финальная страница открыта.')
  }

  const claimAchievement = (id: string) => {
    if (!canEdit || progress.claimed.includes(id)) return
    setProgress((current) => ({ ...current, claimed: [...current.claimed, id] }))
    setModal({ id, isNew: true, queue: [] })
  }

  const closeAchievementModal = () => {
    setModal((current) => {
      if (!current || current.queue.length === 0) return null
      const [next, ...queue] = current.queue
      return { id: next, isNew: true, queue }
    })
  }

  const applyStopToggle = (dayId: string, stopId: string) => {
    if (!canEdit) return
    const adding = !(progress.checkedStops[dayId] ?? []).includes(stopId)
    setProgress((current) => {
      const stops = current.checkedStops[dayId] ?? []
      const nextStops = stops.includes(stopId) ? stops.filter((id) => id !== stopId) : [...stops, stopId]
      return { ...current, checkedStops: { ...current.checkedStops, [dayId]: nextStops } }
    })
    if (adding && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPawBurst({ id: `${dayId}:${stopId}`, path: pawPathForKey(`${dayId}:${stopId}`) })
    }
    if (adding && dayId === 'nara' && stopId === 'pokemon-osaka') {
      showKitsuReaction('У Кицу появилась новая печать. За дверью Pokémon Café открылось личное письмо для Юльчоны.')
    }
  }

  const forceUnlockStop = (dayId: string, stopId: string) => {
    if (!canEdit) return
    setProgress((current) => {
      const unlocked = current.unlockedStops[dayId] ?? []
      if (unlocked.includes(stopId)) return current
      return { ...current, unlockedStops: { ...current.unlockedStops, [dayId]: [...unlocked, stopId] } }
    })
  }

  const forceUnlockDay = (date: string) => {
    if (!canEdit) return
    setProgress((current) => current.unlockedDays.includes(date)
      ? current
      : { ...current, unlockedDays: [...current.unlockedDays, date] })
  }

  const toggleStop = (dayId: string, stopId: string, timeUnlocked = false) => {
    if (!canEdit) return
    const stops = progress.checkedStops[dayId] ?? []
    const day = tripDays.find((item) => item.id === dayId)
    const stopIndex = day?.timeline.findIndex((item) => item.id === stopId) ?? -1
    const stopUnlocked = timeUnlocked || (stopIndex >= 0 && (
      stopIndex < 2
      || stops.includes(stopId)
      || stops.includes(day!.timeline[stopIndex - 1].id)
    ))
    if (!stopUnlocked) return

    if (stops.includes(stopId)) {
      applyStopToggle(dayId, stopId)
      return
    }

    const rule = stopAchievementRules.find((item) => item.dayId === dayId && item.stops.some((id) => id === stopId))
    const completesAchievement = rule
      && !progress.claimed.includes(rule.achievementId)
      && rule.stops.every((id) => id === stopId || stops.some((completedId) => completedId === id))

    if (completesAchievement) {
      setConfirmation({
        title: 'Этот знак уже твой?',
        description: 'Если всё случилось, Кицу добавит тайную награду в коллекцию и будет бережно хранить её там.',
        confirmLabel: 'Да, всё случилось',
        onConfirm: () => applyStopToggle(dayId, stopId),
      })
      return
    }

    applyStopToggle(dayId, stopId)
  }

  const addHint = (dayId: string) => {
    if (!canEdit) return
    setProgress((current) => current.hints.includes(dayId) ? current : { ...current, hints: [...current.hints, dayId] })
  }

  const revealAnswer = (day: TripDay) => {
    const allScenesComplete = day.timeline.every((item) => (progress.checkedStops[day.id] ?? []).includes(item.id))
    if (!canEdit || !allScenesComplete || progress.riddleAnswers[day.id] !== undefined || solvedRiddles.includes(day.id)) return
    setProgress((current) => current.reveals.includes(day.id) ? current : { ...current, reveals: [...current.reveals, day.id] })
  }

  const answerRiddle = (day: TripDay, answer: number) => {
    const allScenesComplete = day.timeline.every((item) => (progress.checkedStops[day.id] ?? []).includes(item.id))
    if (!canEdit || !allScenesComplete || progress.riddleAnswers[day.id] !== undefined || solvedRiddles.includes(day.id)) return
    setProgress((current) => {
      if (current.riddleAnswers[day.id] !== undefined || (current.solvedRiddles ?? []).includes(day.id)) return current
      const solved = current.solvedRiddles ?? []
      return {
        ...current,
        riddleAnswers: { ...current.riddleAnswers, [day.id]: answer },
        solvedRiddles: answer === day.riddle.answer && day.riddle.location
          ? [...solved, day.id]
          : solved,
      }
    })
    if (answer === day.riddle.answer) {
      showKitsuReaction(day.riddle.location
        ? 'Правильная улика! Кицу довольно щурится: ты заметила то, мимо чего легко пройти.'
        : 'Верно! Последняя печать дня вспыхнула и сохранила твой ответ.')
    }
  }

  const handlePhoto = async (file: File | undefined, dayId: string) => {
    if (!canEdit || !file) return
    setPhotoError('')
    try {
      const photo = await compressPhoto(file)
      await savePendingPhoto(dayId, photo)
      durablePendingPhotoIds.current.add(dayId)
      setProgress((current) => ({ ...current, photos: { ...current.photos, [dayId]: photo } }))
      showKitsuReaction('Этот кадр пахнет сегодняшним днём. Кицу спрятал его в плёнку памяти.')
    } catch (error) {
      setPhotoError(error instanceof Error && error.message.startsWith('Этот формат')
        ? error.message
        : 'Телефон не разрешил сохранить фото офлайн. Освободи немного памяти и попробуй ещё раз.')
    }
  }

  const applyListToggle = (field: 'stamps' | 'sideQuests' | 'konbini', id: string) => {
    if (!canEdit) return
    const adding = !(progress[field] ?? []).includes(id)
    setProgress((current) => {
      const values = current[field] ?? []
      const next = values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
      return { ...current, [field]: next }
    })
    if (adding && field === 'stamps') showKitsuReaction('Новая печать легла в паспорт. Кицу проверил оттиск кончиком хвоста.')
    if (adding && field === 'sideQuests') showKitsuReaction('Случайная находка стала частью истории. Именно такие повороты Кицу любит больше всего.')
  }

  const toggleListValue = (field: 'stamps' | 'sideQuests' | 'konbini', id: string) => {
    if (!canEdit) return
    const values = progress[field] ?? []
    if (values.includes(id)) {
      applyListToggle(field, id)
      return
    }

    const specialSideQuestAchievements: Record<string, string> = {
      'manhole-hunter': 'manhole-hunter',
      'paper-fortune': 'fortune-found',
    }
    const specialAchievement = specialSideQuestAchievements[id]
    const opensAchievement = (
      field === 'stamps' && values.length === 4 && !progress.claimed.includes('stamp-hunter')
    ) || (
      field === 'konbini' && values.length === 2 && !progress.claimed.includes('konbini-connoisseur')
    ) || (
      field === 'sideQuests' && (
        (values.length === 4 && !progress.claimed.includes('wandering-legend'))
        || (typeof specialAchievement === 'string' && !progress.claimed.includes(specialAchievement))
      )
    )

    if (opensAchievement) {
      setConfirmation({
        title: 'Оставить находку в истории?',
        description: 'Кицу откроет за неё особую награду. Даже если потом передумаешь насчёт отметки, воспоминание останется в коллекции.',
        confirmLabel: 'Оставить в истории',
        onConfirm: () => applyListToggle(field, id),
      })
      return
    }

    applyListToggle(field, id)
  }

  const requestRiddleAnswer = (day: TripDay, answer: number) => {
    const allScenesComplete = day.timeline.every((item) => (progress.checkedStops[day.id] ?? []).includes(item.id))
    if (!canEdit || !allScenesComplete || progress.riddleAnswers[day.id] !== undefined || solvedRiddles.includes(day.id)) return
    setConfirmation({
      title: 'Это твой ответ?',
      description: `Ты выбрала «${day.riddle.options[answer]}». Кицу запомнит этот выбор. Если он окажется неверным, один шанс вернуть ответ подарит только негорящая искра FromSoftware.`,
      confirmLabel: 'Да, отвечаю так',
      onConfirm: () => answerRiddle(day, answer),
    })
  }

  const requestChapterClaim = (id: string) => {
    if (!canEdit) return
    setConfirmation({
      title: 'Забрать печать этой главы?',
      description: 'Если этот момент уже случился, Кицу положит награду в коллекцию, чтобы она больше не потерялась.',
      confirmLabel: 'Забрать печать',
      onConfirm: () => claimAchievement(id),
    })
  }

  const recordTripCounter = (id: TripCounterId) => {
    if (!canEdit) return
    setProgress((current) => {
      const currentCounters = current.tripCounters ?? emptyTripCounters
      const nextValue = (currentCounters[id] ?? 0) + 1
      return {
        ...current,
        ramen: current.ramen || (id === 'ramen' && nextValue > 0),
        tripCounters: { ...currentCounters, [id]: nextValue },
      }
    })
  }

  const updateRating = (value: number) => {
    if (!canEdit) return
    const save = () => {
      setProgress((current) => ({ ...current, ratings: { ...current.ratings, [selectedDay.id]: value } }))
      if (value === 10) showKitsuReaction('Легендарный день! Кицу поставил рядом маленькую невидимую звезду.')
    }
    if (value === 10 && !progress.claimed.includes('perfect-day')) {
      setConfirmation({
        title: 'Правда легендарный день?',
        description: 'Кицу поставит рядом тайную звезду и откроет за неё особую награду.',
        confirmLabel: 'Точно 10/10',
        onConfirm: save,
      })
      return
    }
    save()
  }

  const updateDailySteps = (rawValue: string) => {
    if (!canEdit) return
    const digits = rawValue.replace(/\D/g, '').slice(0, 6)
    const steps = Number(digits)
    setProgress((current) => {
      const nextSteps = { ...current.dailySteps }
      if (!digits || steps <= 0) delete nextSteps[selectedDay.id]
      else nextSteps[selectedDay.id] = Math.min(100_000, steps)
      return { ...current, dailySteps: nextSteps }
    })
  }

  const selectPhoto = (file: File | undefined, dayId: string) => {
    if (!canEdit || !file) return
    const isNewDayPhoto = !progress.photos[dayId]
    const opensAchievement = isNewDayPhoto
      && Object.keys(progress.photos).length === 4
      && !progress.claimed.includes('memory-keeper')
    if (opensAchievement) {
      setConfirmation({
        title: 'Оставить пятый кадр в памяти?',
        description: 'Он появится в общей плёнке, а Кицу откроет награду хранительницы воспоминаний.',
        confirmLabel: 'Оставить кадр',
        onConfirm: () => void handlePhoto(file, dayId),
      })
      return
    }
    void handlePhoto(file, dayId)
  }

  const openOfflinePanel = () => {
    setOfflinePanelOpen(true)
    setOfflinePackError('')
    if (offlinePackStatus === 'downloading') return
    setOfflinePackStatus('checking')
    void readOfflinePackStatus()
      .then((status) => {
        setOfflinePackProgress({ completed: status.completed, total: status.total })
        setOfflinePackStatus(status.supported ? status.ready ? 'ready' : 'available' : 'unsupported')
      })
      .catch(() => setOfflinePackStatus('error'))
  }

  const prepareOfflineTrip = async () => {
    if (!networkOnline || offlinePackStatus === 'downloading') return
    setOfflinePackError('')
    setOfflinePackStatus('downloading')
    try {
      await requestPersistentOfflineStorage()
      const result = await downloadOfflinePack((completed, total) => setOfflinePackProgress({ completed, total }))
      setOfflinePackProgress(result)
      setOfflinePackStatus('ready')
    } catch {
      setOfflinePackStatus('error')
      setOfflinePackError('Не всё удалось скачать. Проверь Wi‑Fi и нажми ещё раз — уже сохранённые файлы повторно качаться не будут.')
    }
  }

  const enterAccessMode = (mode: AccessMode) => {
    rememberAccessMode(mode)
    setAccessChecking(!PREVIEW_MODE && mode === 'editor')
    setAccessMode(mode)
  }

  const chooseAnotherMode = () => {
    forgetAccessMode()
    setAccessChecking(false)
    setAccessMode(null)
    setCloudInitialized(false)
    setCloudStatus('checking')
  }

  const lockedHeroHold = useFiveSecondHold<HTMLElement>(canEdit && !selectedUnlocked, () => forceUnlockDay(selectedDate))

  if (!accessMode) return <AccessGate onEnter={enterAccessMode} />
  if (accessChecking) {
    return (
      <main className="access-gate is-loading">
        <div className="access-gate-shade" />
        <section className="access-gate-card"><img src="/assets/kitsune-guide.webp" alt="Кицу" /><h1>Кицу открывает дневник…</h1></section>
      </main>
    )
  }

  return (
    <div className={`app-shell is-${accessMode}`}>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => { setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <img src="/assets/chonchetrip-icon.png" alt="" />
          <span><strong>Chonchetrip</strong><small>Юльчона · Japan 2026</small></span>
        </button>
        <div className="topbar-actions">
          <button
            className={`offline-token is-${offlinePackStatus}${!networkOnline ? ' is-offline' : ''}${syncPending || pendingPhotoCount > 0 ? ' has-pending' : ''}`}
            type="button"
            onClick={openOfflinePanel}
            aria-label={!networkOnline
              ? 'Нет сети. Изменения сохраняются на телефоне.'
              : offlinePackStatus === 'ready'
                ? 'Поездка доступна офлайн.'
                : 'Скачать поездку офлайн.'}
          >
            <Icon name={offlinePackStatus === 'ready' ? 'check' : 'download'} size={17} />
            {(syncPending || pendingPhotoCount > 0) && <span />}
          </button>
          <button className={`access-mode-token is-${cloudStatus}`} type="button" onClick={chooseAnotherMode} aria-label={accessMode === 'editor' ? 'Это дневник Юльчоны. Нажми, чтобы вернуться ко входу.' : 'Ты смотришь путешествие со стороны. Нажми, чтобы вернуться ко входу.'}><Icon name={accessMode === 'editor' ? 'fox' : 'eye'} size={16} /><span /></button>
          <button className="progress-token" type="button" onClick={() => setView('collection')} aria-label={`${discoveredCount} из ${achievements.length} печатей пути`}><Icon name="collection" size={17} /><span>{discoveredCount}/{achievements.length}</span></button>
        </div>
      </header>

      <main>
        {view === 'journey' && (
          <>
            <section
              className={selectedUnlocked ? 'chapter-hero' : `chapter-hero is-locked${lockedHeroHold.holding ? ' is-holding' : ''}`}
              style={{ backgroundImage: `url(${selectedUnlocked ? selectedDay.cover : '/assets/chonchetrip-splash.webp'})` }}
              role={!selectedUnlocked && canEdit ? 'button' : undefined}
              tabIndex={!selectedUnlocked && canEdit ? 0 : undefined}
              aria-label={selectedUnlocked ? undefined : canEdit ? `Глава ${selectedDay.dateLabel} пока под печатью. Чтобы открыть её раньше, удерживай пять секунд.` : `Глава ${selectedDay.dateLabel} пока под печатью.`}
              {...(!selectedUnlocked && canEdit ? lockedHeroHold.holdProps : {})}
            >
              <div className="hero-shade" />
              <div className="hero-content">
                {previewMode && <span className="preview-pill">Взгляд из будущего · {previewDateLabel}</span>}
                {!selectedUnlocked && <span className="hero-lock"><Icon name="lock" size={18} /> До открытия главы</span>}
                <p>{selectedUnlocked ? selectedDay.eyebrow : 'История ещё спит'}</p>
                <h1>{selectedUnlocked ? selectedDay.title : lockedHeroHold.holding ? 'Открываю…' : `${daysUntil(selectedDate)} дн.`}</h1>
                <span>{selectedUnlocked ? selectedDay.subtitle : lockedHeroHold.holding ? 'Не отпускай · Кицу снимает печать' : `Глава откроется ${selectedDay.dateLabel} · ${selectedUnlockTiming.hero}`}</span>
              </div>
            </section>

            <section className="day-rail-section" aria-label="Дни путешествия">
              <div ref={dayRailRef} className={dayRailDragging ? 'day-rail is-dragging' : 'day-rail'} aria-label="Лента дней" {...dayRailDragProps}>
                {tripDays.map((slot, index) => {
                  const content = dayContentForDate(slot.date)
                  const unlocked = slot.date <= today || progress.unlockedDays.includes(slot.date)
                  const active = slot.date === selectedDate
                  const claimed = content.achievementId ? progress.claimed.includes(content.achievementId) : false
                  return <JourneyDayChip key={slot.date} slot={slot} index={index} city={content.city} active={active} unlocked={unlocked} claimed={claimed} editable={canEdit} onSelect={() => setSelectedDate(slot.date)} onForceUnlock={() => { forceUnlockDay(slot.date); setSelectedDate(slot.date) }} />
                })}
              </div>
            </section>

            {selectedUnlocked ? (
              <div className={`screen-content day-content vibe-${selectedDay.vibe.tone}`}>
                <section className="chapter-heading">
                  <div><span className="section-kicker">{selectedDay.dateLabel} · {selectedDay.city}</span><h2>Приключение дня</h2></div>
                  <div className="day-progress" aria-label={`${selectedCompletedSceneCount} из ${selectedSceneIds.length} моментов пройдено`}><strong>{selectedCompletedSceneCount}/{selectedSceneIds.length}</strong><small>готово</small></div>
                </section>

                <DayVibeCard vibe={selectedDay.vibe} />

                {selectedDay.timeGuide && <JourneyTimeGuide guide={selectedDay.timeGuide} />}

                {selectedMagic && (
                  <section className={selectedFoxFireFound ? 'paper-card kitsu-whisper-card is-found' : 'paper-card kitsu-whisper-card'} style={{ '--flame-color': selectedMagic.flameColor } as React.CSSProperties}>
                    <div className="paw-trail" aria-hidden="true"><i /><i /><i /></div>
                    <div className="kitsu-whisper-heading">
                      <div><span className="section-kicker">Лисий огонёк дня</span><h2>{selectedFoxFireFound ? 'Огонёк найден' : 'Кицу оставил улику'}</h2></div>
                      <span className={selectedFoxFireFound ? 'fox-fire is-burning' : 'fox-fire'} aria-hidden="true"><i /></span>
                    </div>
                    <blockquote>«{selectedMagic.whisper}»</blockquote>
                    <div className="magic-clue"><Icon name="sparkles" size={18} /><div><strong>{selectedFoxFireFound ? selectedMagic.flameTitle : 'Маленькая миссия'}</strong><p>{selectedFoxFireFound ? selectedMagic.discovery : selectedMagic.clue}</p></div></div>
                    <button type="button" className={selectedFoxFireFound ? 'magic-found-button' : 'magic-find-button'} disabled={selectedFoxFireFound || !canEdit} onClick={() => discoverFoxFire(selectedMagic)}>
                      {selectedFoxFireFound ? <><Icon name="check" size={17} /> Огонёк найден</> : canEdit ? selectedMagic.actionLabel : 'Огонёк ещё не найден'}
                    </button>
                  </section>
                )}

                <DayMapCard
                  key={`${selectedDate}-${selectedDay.id}`}
                  day={selectedDay}
                  completedStops={selectedStops}
                />

                <section className="timeline-list">
                  {selectedDay.timeline.map((item, index) => {
                    const complete = selectedStops.includes(item.id)
                    const eveningUnlock = index >= selectedDay.timeline.length - 2
                    const timeUnlocked = eveningUnlock ? selectedEveningUnlocked : selectedAfternoonUnlocked
                    const previousComplete = index < 2 || selectedStops.includes(selectedDay.timeline[index - 1].id)
                    const manuallyUnlocked = selectedUnlockedStops.includes(item.id)
                    const accessible = previousComplete || timeUnlocked || manuallyUnlocked
                    return (
                      <TimelineCard
                        key={item.id}
                        item={item}
                        complete={complete}
                        locked={!complete && !accessible}
                        editable={canEdit}
                        fromsoftRelic={progress.fromsoftRelic}
                        onToggle={() => toggleStop(selectedDay.id, item.id, accessible)}
                        onForceUnlock={() => forceUnlockStop(selectedDay.id, item.id)}
                        onFindFromsoftRelic={findFromsoftRelic}
                      />
                    )
                  })}
                </section>

                <section className="paper-card fact-card">
                  <div className="card-label"><Icon name="fox" size={18} /> Шёпот Кицу</div>
                  <img src="/assets/kitsune-guide.webp" alt="" />
                  <p>{selectedDay.fact}</p>
                </section>

                {selectedMagic?.nightEncounter && (
                  selectedNightMagicUnlocked ? (
                    <button type="button" className={selectedEncounterFound ? 'kitsu-night-encounter is-found' : 'kitsu-night-encounter'} disabled={selectedEncounterFound || !canEdit} onClick={() => findNightEncounter(selectedMagic)}>
                      <span className="night-peek"><img src="/assets/kitsune-guide.webp" alt="" /><i /></span>
                      <span><small>{selectedEncounterFound ? 'История осталась с тобой' : canEdit ? 'Кто-то прячется рядом…' : 'Встреча ещё не случилась'}</small><strong>{selectedEncounterFound ? selectedMagic.nightEncounter.title : canEdit ? selectedMagic.nightEncounter.actionLabel : 'Юльчона ещё не здесь'}</strong><em>{selectedEncounterFound ? selectedMagic.nightEncounter.message : canEdit ? 'Лови момент, пока рыжий хвост снова не исчез.' : 'Кицу пока оставил только рыжий след.'}</em></span>
                      <Icon name={selectedEncounterFound ? 'check' : 'eye'} size={19} />
                    </button>
                  ) : (
                    <div className="kitsu-night-locked"><Icon name="lock" size={16} /><span>После 19:00 здесь может появиться кто-то ещё</span></div>
                  )
                )}

                <section className={`paper-card riddle-card${selectedRiddleUnlocked ? ' is-open' : ' is-sealed'}`}>
                  {selectedRiddleUnlocked ? (
                    <>
                      <div className="riddle-opened-heading">
                        <div className="card-label"><Icon name="quest" size={18} /> Загадка дня</div>
                        <span><Icon name="check" size={14} /> День прожит до конца</span>
                      </div>
                      {selectedDay.riddle.location && (
                        <div className="field-riddle-location">
                          <span><Icon name="place" size={17} /></span>
                          <div><strong>Найди на месте</strong><small>{selectedDay.riddle.location}</small></div>
                        </div>
                      )}
                      <h3>{selectedDay.riddle.question}</h3>
                      <div className="answer-grid">
                        {selectedDay.riddle.options.map((option, index) => {
                          const chosen = selectedAnswer === index
                          const revealed = selectedRiddleRevealed && selectedAnswer === undefined && index === selectedDay.riddle.answer
                          const answerClass = chosen
                            ? (index === selectedDay.riddle.answer ? ' is-correct' : ' is-wrong')
                            : revealed ? ' is-revealed' : ''
                          const answerLocked = selectedRiddleSolved || selectedAnswer !== undefined || !canEdit
                          const revealLocked = selectedRiddleRevealed && index !== selectedDay.riddle.answer
                          return <button key={option} type="button" className={`answer-button${answerClass}`} disabled={answerLocked || revealLocked} onClick={() => requestRiddleAnswer(selectedDay, index)}>{option}</button>
                        })}
                      </div>
                      {selectedRiddleRevealed && selectedAnswer === undefined && <p className="reveal-note">{canEdit ? 'Верный ответ подсвечен. Коснись его, если хочешь выбрать этот вариант.' : 'Верный ответ уже подсвечен.'}</p>}
                      {isCorrect && <p className="answer-note"><Icon name="check" size={16} /> {selectedDay.riddle.explanation}</p>}
                      {selectedAnswer !== undefined && !isCorrect && (
                        <p className="try-again">Кицу запомнил этот ответ. {progress.fromsoftEmberUsedAt ? 'Негорящая искра уже погасла.' : progress.fromsoftRelic ? 'Негорящая искра может один раз вернуть выбор.' : 'Изменить его сможет только найденная искра FromSoftware.'}</p>
                      )}
                      {selectedHintUsed && <p className="hint-text">Подсказка: {selectedDay.riddle.hint}</p>}
                      {selectedEmberAvailable && (
                        <button type="button" className="fromsoft-riddle-button" onClick={() => activateFromsoftEmber(selectedDay)}>
                          <span><Icon name="sparkles" size={17} /></span>
                          <span><strong>{progress.fromsoftRelic === 'dark-souls' ? 'Разжечь костёр' : 'Коснуться благодати'}</strong><small>Вернуть один неверный ответ и попробовать ещё раз</small></span>
                          <Icon name="chevron" size={17} />
                        </button>
                      )}
                      <div className="riddle-actions">
                        <button type="button" className="text-button" disabled={!canEdit || selectedAnswer !== undefined || selectedHintUsed || selectedRiddleSolved || selectedRiddleRevealed} onClick={() => addHint(selectedDay.id)}><Icon name="hint" size={17} /> {selectedHintUsed ? 'Подсказка открыта' : selectedRiddleSolved || isCorrect ? 'Разгадано' : canEdit ? 'Подсказка' : 'Подсказка ещё закрыта'}</button>
                        <button type="button" className="text-button muted" disabled={!canEdit || selectedAnswer !== undefined || selectedRiddleRevealed || selectedRiddleSolved} onClick={() => revealAnswer(selectedDay)}><Icon name="eye" size={17} /> {selectedRiddleRevealed ? 'Верный ответ открыт' : selectedRiddleSolved || isCorrect ? 'Разгадано' : canEdit ? 'Показать верный ответ' : 'Ответ ещё закрыт'}</button>
                      </div>
                    </>
                  ) : (
                    <div className="riddle-seal" role="status" aria-label={`Загадка дня пока спит. Прожито ${selectedCompletedSceneCount} из ${selectedSceneIds.length} моментов.`}>
                      <span className="riddle-seal-glow" aria-hidden="true"><i /><i /><i /></span>
                      <span className="riddle-seal-lock"><Icon name="lock" size={23} /></span>
                      <small>Финальная печать дня</small>
                      <h3>Загадка пока спит</h3>
                      <p>{canEdit ? 'Отметь все моменты дня — после последней галочки Кицу зажжёт вопрос.' : 'Вопрос откроется, когда все моменты дня будут прожиты.'}</p>
                      <div className="riddle-seal-progress"><span style={{ width: `${selectedSceneIds.length > 0 ? (selectedCompletedSceneCount / selectedSceneIds.length) * 100 : 0}%` }} /></div>
                      <strong>{selectedCompletedSceneCount} / {selectedSceneIds.length} моментов</strong>
                    </div>
                  )}
                </section>

                {selectedAchievement && (
                  <section className={selectedClaimed ? 'paper-card claim-card is-claimed' : 'paper-card claim-card'}>
                    <div className="claim-copy">
                      <span className="section-kicker">Награда главы</span>
                      <h3>{selectedClaimed ? selectedAchievement.title : canEdit ? 'Печать ждёт тебя' : 'Печать ещё закрыта'}</h3>
                      <p>{selectedClaimed ? selectedAchievement.description : canEdit ? 'Когда этот момент случится, забери свою печать. Кицу уже оставил для неё место.' : 'Кицу оставил для неё место и пока хранит рисунок в тайне.'}</p>
                    </div>
                    <div className="claim-badge"><AchievementVisual achievement={selectedAchievement} locked={!selectedClaimed} /></div>
                    <button type="button" className={selectedClaimed ? 'claimed-button' : 'primary-button'} disabled={selectedClaimed || !canEdit} onClick={() => requestChapterClaim(selectedAchievement.id)}>
                      {selectedClaimed ? <><Icon name="check" size={18} /> Получено</> : canEdit ? selectedDay.claimLabel : 'Пока запечатано'}
                    </button>
                  </section>
                )}

                <section className="paper-card memory-card">
                  <div className="memory-heading"><div><span className="section-kicker">Память дня</span><h3>{canEdit ? 'Сохранить этот день' : 'Память этого дня'}</h3></div><Icon name="camera" size={25} /></div>
                  {progress.photos[selectedDay.id] ? (
                    <div className="photo-preview">
                      <img src={progress.photos[selectedDay.id]} alt={`Фото дня · ${selectedDay.dateLabel}`} />
                      {canEdit && <label className="photo-change">Заменить<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; selectPhoto(file, selectedDay.id) }} /></label>}
                    </div>
                  ) : canEdit ? (
                    <label className="photo-drop"><Icon name="camera" size={22} /><span>Выбрать кадр этого дня</span><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; selectPhoto(file, selectedDay.id) }} /></label>
                  ) : (
                    <div className="photo-drop is-readonly"><Icon name="camera" size={22} /><span>Фото дня ещё впереди</span></div>
                  )}
                  {photoError && <p className="error-message">{photoError}</p>}
                  <div className="rating-row"><span>Как прошёл день?</span><strong>{rating ? `${rating}/10` : 'ещё нет'}</strong></div>
                  <div id="day-rating" className="rating-options" role="group" aria-label="Оценка дня от 1 до 10">
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                      <button key={value} type="button" className={rating === value ? 'rating-option is-selected' : 'rating-option'} aria-pressed={rating === value} disabled={!canEdit} onClick={() => updateRating(value)}>{value}</button>
                    ))}
                  </div>
                  <div className="rating-scale"><span>тихо</span><span>легендарно</span></div>
                  <div className="daily-steps">
                    <span>👣 Лисьи следы</span>
                    <label className="daily-steps-input">
                      <span className="sr-only">Шаги за день</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="0"
                        value={selectedDaySteps}
                        disabled={!canEdit}
                        onChange={(event) => updateDailySteps(event.target.value)}
                      />
                      <em>шагов</em>
                    </label>
                  </div>
                </section>
              </div>
            ) : (
              <LockedDayContent
                editable={canEdit}
                timingLabel={selectedUnlockTiming.label}
                timingDescription={selectedUnlockTiming.description}
                onForceUnlock={() => forceUnlockDay(selectedDate)}
              />
            )}
          </>
        )}

        {view === 'collection' && (
          <div className="screen-content collection-screen">
            <section className="page-intro"><span className="section-kicker">Собрано по дороге</span><h1>Коллекция пути</h1><p>Здесь остаются хорошие моменты, которые действительно случились с вами по дороге.</p></section>
            <section className="collection-progress">
              <div><span>Собрано воспоминаний</span><strong>{discoveredCount}<small> / {achievements.length}</small></strong></div>
              <div className="progress-line"><span style={{ width: `${(discoveredCount / achievements.length) * 100}%` }} /></div>
            </section>
            <div className="achievement-groups">
              {achievementGroups.map((group) => {
                const groupAchievements = achievements.filter((achievement) => achievement.type === group.type)
                return (
                  <section key={group.type} className={`achievement-group is-${group.type}`}>
                    <div className="achievement-group-heading">
                      <div><span className="section-kicker">{group.kicker}</span><h2>{group.title}</h2></div>
                      <p>{group.note}</p>
                    </div>
                    <div className="badge-grid">
                      {groupAchievements.map((achievement) => {
                        const unlocked = progress.claimed.includes(achievement.id)
                        const effectiveUnlockDate = achievement.unlockDate
                        const futureStory = achievement.type === 'story' && effectiveUnlockDate && effectiveUnlockDate > today
                        return (
                          <button key={achievement.id} type="button" className={unlocked ? 'badge-tile is-unlocked' : 'badge-tile'} disabled={!unlocked} onClick={() => setModal({ id: achievement.id, isNew: false, queue: [] })}>
                            <span className="badge-frame"><AchievementVisual achievement={achievement} locked={!unlocked} />{!unlocked && <span className="badge-lock"><Icon name="lock" size={16} /></span>}</span>
                            <strong>{unlocked ? achievement.title : '???'}</strong>
                            <small>{unlocked ? achievement.description : futureStory ? 'Будущая глава' : 'Пока скрыто'}</small>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}

        {view === 'passport' && (
          <div className="screen-content passport-screen">
            <section className="page-intro passport-intro">
              <div><span className="section-kicker">Путевой дневник</span><h1>Дневник Юльчоны</h1><p>Здесь Кицу складывает находки, случайности и личные победы всей поездки.</p></div>
              <img src="/assets/kitsune-guide.webp" alt="" />
            </section>

            <section className="passport-overview" aria-label="Краткий обзор полевого дневника">
              <span><Icon name="stamp" size={17} /><strong>{progress.stamps.length}/5</strong><small>печатей</small></span>
              <span><Icon name="camera" size={17} /><strong>{Object.keys(progress.photos).length}</strong><small>фото дня</small></span>
              <span><Icon name="quest" size={17} /><strong>{completedSideQuests.length}</strong><small>находок</small></span>
            </section>

            <section className="passport-section trip-counters-section">
              <div className="section-title"><div><span className="section-kicker">Секретный счёт Кицу</span><h2>Кицу, запомни!</h2></div><span className="trip-counters-seal"><Icon name="fox" size={19} /></span></div>
              <p className="trip-counters-note">{canEdit ? 'Когда встретится что-то из списка, коснись его. Все числа Кицу покажет только в конце путешествия.' : 'Секретный счёт пока молчит. Все числа Кицу покажет только в конце путешествия.'}</p>
              <div className="trip-counter-list">
                {regularTripCounterDefinitions.map((definition) => (
                  <TripCounterCard key={definition.id} definition={definition} editable={canEdit} onAdd={() => recordTripCounter(definition.id)} />
                ))}
              </div>
              <TripCounterCard definition={trainTripCounterDefinition} editable={canEdit} onAdd={() => recordTripCounter(trainTripCounterDefinition.id)} />
            </section>

            <section className="passport-section">
              <div className="section-title"><div><span className="section-kicker">駅スタンプ · печати станций</span><h2>Пять станционных печатей</h2></div><strong>{progress.stamps.length}/5</strong></div>
              <details className="stamp-help">
                <summary><span><Icon name="hint" size={18} /></span><span><strong>Какая печать куда?</strong><small>Короткая шпаргалка без путаницы</small></span><Icon name="chevron" size={17} /></summary>
                <div className="stamp-system-guide">
                  <div>
                    <strong>Eki stamp</strong>
                    <p>Ставишь сама в туристический блокнот. Не в загранпаспорт. А потом добавляешь находку сюда.</p>
                  </div>
                  <div>
                    <strong>Goshuin</strong>
                    <p>Служитель оформляет в отдельной goshuincho. В эти пять станционных печатей он не входит.</p>
                  </div>
                </div>
              </details>
              <div className="stamp-list">
                {passportStamps.map((stamp, index) => {
                  const found = progress.stamps.includes(stamp.id)
                  return (
                    <button key={stamp.id} type="button" disabled={!canEdit} className={found ? 'stamp-card is-found' : 'stamp-card'} onClick={() => toggleListValue('stamps', stamp.id)}>
                      <span className="stamp-mark">{found ? <Icon name="check" size={22} /> : index + 1}</span>
                      <span><strong>{stamp.title}</strong><small>{stamp.subtitle}</small></span>
                      <Icon name="stamp" size={23} />
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="paper-card side-quests">
              <div className="card-label"><Icon name="quest" size={18} /> Side quests</div>
              <h3>Случайные находки</h3>
              <p className="side-quest-note">Здесь ничего не нужно успевать: остаётся только то, что само встретилось по дороге.</p>
              <p className="mini-label">Заглянуть в три разных konbini</p>
              <div className="konbini-grid">
                {['7-Eleven', 'FamilyMart', 'Lawson'].map((shop) => <button key={shop} type="button" disabled={!canEdit} className={progress.konbini.includes(shop) ? 'is-active' : ''} onClick={() => toggleListValue('konbini', shop)}>{progress.konbini.includes(shop) && <Icon name="check" size={14} />}{shop}</button>)}
              </div>
              <details className="side-quest-drawer">
                <summary><span><Icon name="sparkles" size={18} /></span><span><strong>Посмотреть случайные находки</strong><small>{completedSideQuests.length} из {sideQuests.length} уже стали частью истории</small></span><Icon name="chevron" size={17} /></summary>
                <div className="side-quest-list">
                  {sideQuests.map((quest) => {
                    const complete = completedSideQuests.includes(quest.id)
                    return (
                      <button key={quest.id} type="button" disabled={!canEdit} className={complete ? 'quest-toggle is-complete' : 'quest-toggle'} onClick={() => toggleListValue('sideQuests', quest.id)}>
                        <span className="quest-toggle-icon"><Icon name={quest.icon} size={21} /></span>
                        <span><strong>{quest.title}</strong><small>{quest.description}</small></span>
                        <span className="mini-check">{complete && <Icon name="check" size={16} />}</span>
                      </button>
                    )
                  })}
                </div>
              </details>
            </section>

            <section className="passport-section photo-journal">
              <div className="section-title"><div><span className="section-kicker">Кадры по дороге</span><h2>Плёнка памяти</h2></div><strong>{Object.keys(progress.photos).length}</strong></div>
              {Object.keys(progress.photos).length > 0 ? (
                <div className="photo-strip">{tripDays.map((slot) => dayContentForDate(slot.date)).filter((day) => progress.photos[day.id]).map((day) => <button key={`${day.date}-${day.id}`} type="button" onClick={() => { setSelectedDate(day.date); setView('journey'); window.scrollTo({ top: 0 }) }}><img src={progress.photos[day.id]} alt={day.dateLabel} /><span>{day.dateLabel}</span></button>)}</div>
              ) : <div className="empty-journal"><Icon name="camera" size={25} /></div>}
            </section>
          </div>
        )}

        {view === 'kitsu' && (
          <div className="screen-content kitsu-screen">
            <section className={`kitsu-hero mood-${kitsuMood} stage-${visibleTailCount}`}>
              <div className="kitsu-hero-copy">
                <span className="section-kicker">{kitsuMoodLabel}</span>
                <h1>Кицу</h1>
                <p>{kitsuStage.title} · {kitsuStage.subtitle}</p>
                <div className="kitsu-level"><span><i style={{ width: `${(knownFoxFires.length / kitsuMagicDays.length) * 100}%` }} /></span><strong>{knownFoxFires.length}/{kitsuMagicDays.length} огней</strong></div>
              </div>
              <div className="tail-lights" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} className={index < visibleTailCount ? 'is-lit' : ''} />)}</div>
              <img src="/assets/kitsune-guide.webp" alt="Кицу, лисий проводник путешествия" />
            </section>

            <section className="kitsu-welcome" aria-label="Кто такой Кицу и главное правило путешествия">
              <div className="kitsu-welcome-about">
                <span className="kitsu-welcome-icon"><Icon name="fox" size={21} /></span>
                <div><small>Кто такой Кицу</small><h2>Хранитель вашей истории</h2><p>Он не торопит и не считает опоздания. Только подсказывает, замечает находки и бережно хранит то, что случилось именно с вами.</p></div>
              </div>
              <div className="kitsu-welcome-rule">
                <span><Icon name="sparkles" size={18} /></span>
                <div><small>Главное правило</small><h3>Никакой гонки</h3><p>Устала? Отдых тоже приключение. Погода поменяла план? Значит, история выбрала другой путь. Здесь невозможно пройти что-то неправильно.</p></div>
              </div>
            </section>

            <nav className="kitsu-shortcuts" aria-label="Быстрые переходы по вкладке Кицу">
              {[
                ['kitsu-fires', 'Огни', 'sparkles'],
                ['kitsu-letters', 'Письма', 'lock'],
                ['kitsu-encounters', 'Истории', 'fox'],
                ['kitsu-metro', 'Метро', 'route'],
                ['kitsu-phrases', 'Фразы', 'hint'],
              ].map(([target, label, icon]) => <button key={target} type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Icon name={icon} size={15} />{label}</button>)}
            </nav>

            <section id="kitsu-fires" className="kitsu-magic-section kitsu-anchor-section">
              <div className="section-title"><div><span className="section-kicker">Kitsunebi</span><h2>Созвездие лисьих огней</h2></div><strong>{knownFoxFires.length}/{kitsuMagicDays.length}</strong></div>
              <p className="kitsu-section-note">Каждый огонёк связан с одной настоящей находкой — именно такой, какой она запомнилась.</p>
              <div className="fox-fire-grid">
                {kitsuMagicDays.map((magic, index) => {
                  const found = knownFoxFires.includes(magic.dayId)
                  const slot = findMagicSlot(magic.dayId)
                  const available = PREVIEW_MODE || Boolean(slot && (slot.date <= today || progress.unlockedDays.includes(slot.date)))
                  return (
                    <button key={magic.dayId} type="button" className={found ? 'fox-fire-tile is-found' : available ? 'fox-fire-tile is-near' : 'fox-fire-tile'} disabled={!available} style={{ '--flame-color': magic.flameColor } as React.CSSProperties} onClick={() => { if (!slot) return; setSelectedDate(slot.date); setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      <span className={found ? 'fox-fire is-burning' : 'fox-fire'}><i /></span>
                      <small>{slot?.dateLabel ?? `Огонь ${index + 1}`}</small>
                      <strong>{found ? magic.flameTitle : available ? 'Огонёк рядом' : '???'}</strong>
                    </button>
                  )
                })}
              </div>
            </section>

            <section id="kitsu-letters" className="kitsu-magic-section letter-section kitsu-anchor-section">
              <div className="section-title"><div><span className="section-kicker">Запечатанные слова</span><h2>Письма по дороге</h2></div>{canEdit ? <strong>{progress.openedLetters.length}/{sealedLetters.length}</strong> : <Icon name="lock" size={18} />}</div>
              {canEdit ? (
                <>
                  <p className="kitsu-section-note">Коснись конверта, и письмо развернётся перед тобой. Уже открытые письма можно перечитывать.</p>
                  <div className="letter-stack">
                    {sealedLetters.map((letter) => {
                      const unlocked = isLetterUnlocked(letter)
                      const opened = progress.openedLetters.includes(letter.id)
                      return (
                        <button key={letter.id} type="button" disabled={!unlocked} className={opened ? 'sealed-letter is-open' : unlocked ? 'sealed-letter is-ready' : 'sealed-letter'} onClick={() => openLetter(letter)}>
                          <span className="letter-seal">{opened ? '心' : letter.seal}</span>
                          <span className="sealed-letter-copy"><small>{opened ? 'Письмо открыто' : unlocked ? 'Печать стала тёплой' : 'Пока запечатано'}</small><strong>{opened || unlocked ? letter.title : 'Слова из будущей главы'}</strong>{!opened && !unlocked && <p>{letter.preview}</p>}</span>
                          <span className="letter-card-action"><Icon name={opened ? 'eye' : unlocked ? 'chevron' : 'lock'} size={16} /></span>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="private-letter-lock">
                  <span><Icon name="lock" size={23} /></span>
                  <div><strong>Письма пока запечатаны</strong><p>Кицу хранит их до встречи с Юльчоной.</p></div>
                </div>
              )}
            </section>

            <section id="kitsu-encounters" className="kitsu-magic-section night-stories-section kitsu-anchor-section">
              <div className="section-title"><div><span className="section-kicker">Редкие встречи</span><h2>Ночной след Кицу</h2></div><strong>{knownKitsuEncounters.length}/{nightMagicDays.length}</strong></div>
              <p className="kitsu-section-note">В некоторые вечера Кицу заглядывает к вам после заката. Если заметить его, здесь навсегда останется короткая история этого дня.</p>
              <div className="night-story-list">
                {nightMagicDays.map((magic, index) => {
                  const encounter = magic.nightEncounter!
                  const found = knownKitsuEncounters.includes(magic.dayId)
                  const slot = findMagicSlot(magic.dayId)
                  const available = PREVIEW_MODE || Boolean(slot && (slot.date < today || (slot.date === today && journeyHour >= 19)))

                  if (found) {
                    return (
                      <details key={magic.dayId} className="night-story is-found" style={{ '--flame-color': magic.flameColor } as React.CSSProperties}>
                        <summary>
                          <span className="night-story-mark"><Icon name="fox" size={20} /></span>
                          <span><small>{slot?.dateLabel ?? `След ${index + 1}`}</small><strong>{encounter.title}</strong></span>
                          <Icon name="chevron" size={17} />
                        </summary>
                        <p>{encounter.story}</p>
                      </details>
                    )
                  }

                  return (
                    <button key={magic.dayId} type="button" className={available ? 'night-story is-near' : 'night-story'} disabled={!available} onClick={() => { if (!slot) return; setSelectedDate(slot.date); setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      <span className="night-story-mark"><Icon name={available ? 'eye' : 'lock'} size={19} /></span>
                      <span><small>{available && slot ? slot.dateLabel : `Ночной след ${index + 1}`}</small><strong>{available ? 'Кицу был где-то рядом…' : 'Пока запечатано'}</strong><p>{available ? 'Вернись в эту главу и найди рыжий хвост.' : 'История откроется в подходящий вечер.'}</p></span>
                      {available && <Icon name="chevron" size={17} />}
                    </button>
                  )
                })}
              </div>
            </section>

            {fromsoftQuestAvailable && (
              <section className="kitsu-magic-section fromsoft-relic-section">
                <div className="section-title"><div><span className="section-kicker">Скрытый путь</span><h2>Негорящая искра</h2></div>{progress.fromsoftRelic ? <Icon name="sparkles" size={19} /> : <Icon name="lock" size={18} />}</div>
                <article className={progress.fromsoftRelic ? 'fromsoft-relic-card is-found' : 'fromsoft-relic-card'}>
                  <div className="fromsoft-relic-visual">
                    <img src="/assets/achivments/kindled-in-japan.webp" alt="" />
                    {!progress.fromsoftRelic && <span><Icon name="lock" size={18} /></span>}
                  </div>
                  <div className="fromsoft-relic-story">
                    <small>{progress.fromsoftRelic ? 'Реликвия Кицу' : 'Неразгаданный след'}</small>
                    <h3>{progress.fromsoftRelic === 'dark-souls' ? 'Костёр среди неона' : progress.fromsoftRelic === 'elden-ring' ? 'Золотой знак в Tokyo' : 'Что-то тлеет в электрическом городе'}</h3>
                    <p>{progress.fromsoftRelic === 'dark-souls'
                      ? 'Среди ярких витрин нашлась вещь из мира Dark Souls. Кицу решил, что в ней живёт настоящая искра: если она добралась до Японии вместе с вами, погаснуть ей уже нельзя.'
                      : progress.fromsoftRelic === 'elden-ring'
                        ? 'Среди вывесок Tokyo мелькнул знак Elden Ring. Кицу поймал золотую искру хвостом и оставил её на случай неверного ответа в одной из загадок.'
                        : 'Кицу чувствует знакомое тепло где-то среди витрин Akihabara. Загляни в большую охоту этого дня и проверь, какой мир оставил этот след.'}</p>
                    {progress.fromsoftRelic ? (
                      <div className={progress.fromsoftEmberUsedAt ? 'fromsoft-power is-used' : 'fromsoft-power'}>
                        <span><Icon name="sparkles" size={16} /></span>
                        <div><strong>{progress.fromsoftEmberUsedAt ? 'Искра уже разожжена' : 'Второй ответ готов'}</strong><p>{progress.fromsoftEmberUsedAt ? 'Она уже вернула выбор в одной загадке.' : 'После неверного ответа Кицу один раз предложит вернуть выбор.'}</p></div>
                      </div>
                    ) : (
                      <button type="button" className="fromsoft-hunt-button" onClick={() => { setSelectedDate('2026-10-10'); setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>К скрытой охоте</button>
                    )}
                  </div>
                </article>
              </section>
            )}

            <section className={progress.finaleOpened ? 'kitsu-finale is-open' : 'kitsu-finale'}>
              <div className="finale-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
              <span className="section-kicker">Созвездие воспоминаний</span>
              {!finaleReady ? (
                <><Icon name="lock" size={28} /><h2>Последняя страница спит</h2><p>Кицу откроет её 13 октября, когда дорога домой станет частью истории.</p></>
              ) : !progress.finaleOpened ? (
                <><Icon name="sparkles" size={30} /><h2>Огни готовы собраться вместе</h2><p>Не нужно было собрать всё идеально. Кицу сложит историю из того, что действительно случилось.</p><button type="button" className="finale-open-button" disabled={!canEdit} onClick={openFinale}>{canEdit ? 'Открыть коробку воспоминаний' : 'Финал пока запечатан'}</button></>
              ) : (
                <>
                  <span className="finale-kanji">おかえり</span>
                  <h2>С возвращением из вашей Японии</h2>
                  <p>Кицу собрал историю такой, какой она получилась.</p>
                  <div className="finale-stats">
                    <span><FinaleCount value={knownFoxFires.length} delay={80} /><small>лисьих огней</small></span>
                    <span><FinaleCount value={Object.keys(progress.photos).length} delay={170} /><small>кадров памяти</small></span>
                    <span><FinaleCount value={progress.stamps.length} delay={260} /><small>печатей</small></span>
                    <span><FinaleCount value={knownKitsuEncounters.length} delay={350} /><small>встреч с Кицу</small></span>
                  </div>
                  {averageTripRatingLabel && (
                    <div className="finale-overall-rating">
                      <span aria-hidden="true">⭐</span>
                      <div><strong>{averageTripRatingLabel}/10</strong><small>такой получилась поездка · {tripRatingDaysLabel}</small></div>
                    </div>
                  )}
                  {totalSteps > 0 && (
                    <div className="finale-steps">
                      <span>👣</span>
                      <div><FinaleCount value={totalSteps} delay={430} /><small>шагов всего</small></div>
                    </div>
                  )}
                  {tripCounterTotal > 0 && (
                    <div className="finale-trip-counters">
                      <small>Что набралось за поездку</small>
                      <div>{tripCounterDefinitions.filter((definition) => tripCounters[definition.id] > 0).map((definition, index) => <span key={definition.id}><i>{definition.icon}</i><FinaleCount value={tripCounters[definition.id]} delay={440 + index * 70} /><em>{definition.finaleLabel}</em></span>)}</div>
                    </div>
                  )}
                  {bestRatingEntry && <p className="finale-favorite">Ярче всего запомнился: <strong>{bestRatedDay?.dateLabel ?? 'один особенный день'} · {bestRatingEntry[1]}/10</strong></p>}
                  <blockquote>«Спасибо за эту Японию: с усталыми ногами, случайными находками и моментами, которых не было ни в одном плане. У этой истории будет продолжение.»</blockquote>
                </>
              )}
            </section>

            <TransitMapsSection />

            <section id="kitsu-phrases" className="phrasebook kitsu-anchor-section">
              <div className="section-title"><div><span className="section-kicker">На всякий случай</span><h2>Двенадцать фраз</h2></div></div>
              <div className="phrase-grid">
                {[
                  ['すみません', 'Sumimasen', 'Извините / можно вас?'],
                  ['ありがとうございます', 'Arigatō gozaimasu', 'Большое спасибо'],
                  ['お願いします', 'Onegaishimasu', 'Пожалуйста'],
                  ['大丈夫です', 'Daijōbu desu', 'Всё хорошо / не нужно'],
                  ['これをください', 'Kore o kudasai', 'Вот это, пожалуйста'],
                  ['温めてください', 'Atatamete kudasai', 'Подогрейте, пожалуйста'],
                  ['駅はどこですか？', 'Eki wa doko desu ka?', 'Где находится станция?'],
                  ['トイレはどこですか？', 'Toire wa doko desu ka?', 'Где находится туалет?'],
                  ['二人です', 'Futari desu', 'Нас двое'],
                  ['予約しています', 'Yoyaku shiteimasu', 'У нас есть бронь'],
                  ['写真を撮ってもいいですか？', 'Shashin o totte mo ii desu ka?', 'Можно сфотографировать?'],
                  ['この電車は～に行きますか？', 'Kono densha wa ～ ni ikimasu ka?', 'Этот поезд идёт до…?'],
                ].map(([japanese, reading, meaning]) => (
                  <article key={japanese}><strong>{japanese}</strong><small>{reading}</small><p>{meaning}</p></article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Главная навигация">
        <button type="button" className={view === 'journey' ? 'is-active' : ''} onClick={() => { setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="journey" size={20} /><span>Путь</span></button>
        <button type="button" className={view === 'collection' ? 'is-active' : ''} onClick={() => { setView('collection'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="collection" size={20} /><span>Награды</span></button>
        <button type="button" className={view === 'passport' ? 'is-active' : ''} onClick={() => { setView('passport'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="passport" size={20} /><span>Паспорт</span></button>
        <button type="button" className={view === 'kitsu' ? 'is-active' : ''} onClick={() => { setView('kitsu'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="fox" size={20} /><span>Кицу</span></button>
      </nav>

      {ambientVisit?.kind === 'tail' && !ambientEffectsPaused && <AmbientTailVisit key={ambientVisit.id} visit={ambientVisit} />}
      {ambientVisit?.kind === 'eyes' && !ambientEffectsPaused && <AmbientEyesBackdrop key={ambientVisit.id} side={ambientVisit.side} />}
      {pawBurst && !ambientEffectsPaused && <ScenePawTrail key={pawBurst.id} path={pawBurst.path} onDone={() => setPawBurst((current) => current?.id === pawBurst.id ? null : current)} />}
      {foxFireFlight && !ambientEffectsPaused && (
        <FoxFireFlightEffect
          key={foxFireFlight.id}
          flight={foxFireFlight}
          onDone={() => setFoxFireFlight((current) => current?.id === foxFireFlight.id ? null : current)}
        />
      )}
      {modalAchievement && modal && <AchievementModal achievement={modalAchievement} isNew={modal.isNew} onClose={closeAchievementModal} />}
      {magicModal && <MagicDiscoveryModal magic={magicModal} onClose={closeMagicDiscovery} />}
      {activeLetter && canEdit && <LetterModal letter={activeLetter} onClose={() => setActiveLetterId(null)} />}
      {confirmation && <ConfirmationDialog request={confirmation} onCancel={() => setConfirmation(null)} />}
      {offlinePanelOpen && (
        <OfflineTravelDialog
          networkOnline={networkOnline}
          standaloneApp={standaloneApp}
          packStatus={offlinePackStatus}
          completed={offlinePackProgress.completed}
          total={offlinePackProgress.total}
          pendingChanges={syncPending}
          pendingPhotos={pendingPhotoCount}
          error={offlinePackError}
          onDownload={() => void prepareOfflineTrip()}
          onClose={() => setOfflinePanelOpen(false)}
        />
      )}
      {kitsuReaction && <KitsuReactionToast key={kitsuReaction.id} message={kitsuReaction.message} />}
    </div>
  )
}

export default App
