import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  CloudUnavailableError,
  checkEditorSession,
  forgetAccessMode,
  loadAccessMode,
  loadSharedProgress,
  rememberAccessMode,
  saveSharedProgress,
  startEditorSession,
  uploadSharedPhoto,
  type AccessMode,
} from './cloudSync'
import {
  achievements,
  passportStamps,
  sideQuests,
  tripDays,
  type Achievement,
  type TimelineItem,
  type TripDay,
} from './tripData'
import {
  kitsuMagicByDay,
  kitsuMagicDays,
  kitsuTalismans,
  sealedLetters,
  type KitsuMagicDay,
} from './kitsuMagic'
import { sceneGuides } from './sceneGuides'

type ViewName = 'journey' | 'collection' | 'passport' | 'kitsu'
type CloudStatus = 'checking' | 'synced' | 'offline' | 'error'

type ConfirmationRequest = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

type Progress = {
  claimed: string[]
  checkedStops: Record<string, string[]>
  unlockedStops: Record<string, string[]>
  unlockedDays: string[]
  hints: string[]
  reveals: string[]
  solvedRiddles: string[]
  stamps: string[]
  sideQuests: string[]
  konbini: string[]
  ramen: boolean
  ratings: Record<string, number>
  photos: Record<string, string>
  fujiDate: '2026-10-09' | '2026-10-11'
  foxFires: string[]
  kitsuEncounters: string[]
  openedLetters: string[]
  finaleOpened: boolean
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

const emptyProgress: Progress = {
  claimed: [],
  checkedStops: {},
  unlockedStops: {},
  unlockedDays: [],
  hints: [],
  reveals: [],
  solvedRiddles: [],
  stamps: [],
  sideQuests: [],
  konbini: [],
  ramen: false,
  ratings: {},
  photos: {},
  fujiDate: '2026-10-09',
  foxFires: [],
  kitsuEncounters: [],
  openedLetters: [],
  finaleOpened: false,
}

const normalizeProgress = (value: unknown): Progress => {
  const parsed = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Progress>
    : {}
  return {
    ...emptyProgress,
    ...parsed,
    checkedStops: parsed.checkedStops ?? {},
    unlockedStops: parsed.unlockedStops ?? {},
    unlockedDays: parsed.unlockedDays ?? [],
    solvedRiddles: parsed.solvedRiddles ?? [],
    sideQuests: parsed.sideQuests ?? [],
    ratings: parsed.ratings ?? {},
    photos: parsed.photos ?? {},
    foxFires: parsed.foxFires ?? [],
    kitsuEncounters: parsed.kitsuEncounters ?? [],
    openedLetters: parsed.openedLetters ?? [],
    finaleOpened: parsed.finaleOpened ?? false,
  }
}

const progressForCloud = ({ photos: _photos, ...progress }: Progress) => progress

const stopAchievementRules = [
  { dayId: 'hello-tokyo', achievementId: 'weather-child', stops: ['shiba', 'tower'] },
  { dayId: 'shibuya-story', achievementId: 'shibuya-incident', stops: ['jujutsu-route'] },
  { dayId: 'shibuya-story', achievementId: 'i-remember-you', stops: ['suga-steps'] },
  { dayId: 'ginza-akihabara', achievementId: 'el-psy-kongroo', stops: ['kanda-myojin-anime', 'steins-gate-line'] },
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

function getJapanToday(): string {
  if (PREVIEW_DATE && /^2026-\d{2}-\d{2}$/.test(PREVIEW_DATE)) return PREVIEW_DATE

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

function useJapanToday(): string {
  const [today, setToday] = useState(getJapanToday)

  useEffect(() => {
    if (PREVIEW_MODE) return

    let midnightTimer: number | undefined
    const syncDate = () => {
      const japanToday = getJapanToday()
      setToday(japanToday)
      const [year, month, day] = japanToday.split('-').map(Number)
      const nextTokyoMidnight = Date.UTC(year, month - 1, day + 1, -9, 0, 0)
      midnightTimer = window.setTimeout(syncDate, Math.max(1_000, nextTokyoMidnight - Date.now() + 250))
    }
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (midnightTimer) window.clearTimeout(midnightTimer)
      syncDate()
    }

    syncDate()
    document.addEventListener('visibilitychange', syncWhenVisible)
    window.addEventListener('pageshow', syncWhenVisible)
    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      window.removeEventListener('pageshow', syncWhenVisible)
    }
  }, [])

  return today
}

function getJapanHour(): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date()).find((part) => part.type === 'hour')?.value

  return Number(hour ?? 0)
}

function useJapanHour(): number {
  const [hour, setHour] = useState(getJapanHour)

  useEffect(() => {
    const syncHour = () => setHour(getJapanHour())
    const timer = window.setInterval(syncHour, 60_000)
    document.addEventListener('visibilitychange', syncHour)
    window.addEventListener('pageshow', syncHour)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', syncHour)
      window.removeEventListener('pageshow', syncHour)
    }
  }, [])

  return hour
}

function dayContentForDate(date: string, fujiDate: Progress['fujiDate']): TripDay {
  const regularDay = tripDays.find((day) => day.date === date) ?? tripDays[0]
  if (fujiDate === '2026-10-09') return regularDay

  if (date === '2026-10-09') {
    const tokyoDay = tripDays.find((day) => day.id === 'asakusa-nakano') ?? regularDay
    return { ...tokyoDay, date, dateLabel: '9 октября' }
  }

  if (date === '2026-10-11') {
    const fujiDay = tripDays.find((day) => day.id === 'fuji') ?? regularDay
    return { ...fujiDay, date, dateLabel: '11 октября' }
  }

  return regularDay
}

function daysUntil(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  const tokyoMidnight = Date.UTC(year, month - 1, day, -9, 0, 0)
  return Math.max(0, Math.ceil((tokyoMidnight - Date.now()) / 86_400_000))
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Не удалось открыть фото'))
      image.onload = () => {
        const maxSide = 760
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Фото не поддерживается'))
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
    stamp: <><path d="M7 20h10M8 17h8l-1-5H9l-1 5ZM9 12c0-2 1-3 1-5a2 2 0 0 1 4 0c0 2 1 3 1 5"/></>,
    bowl: <><path d="M4 11h16c0 5-3 8-8 8s-8-3-8-8ZM8 22h8M7 7c0-2 2-2 2-4M12 7c0-2 2-2 2-4M17 7c0-2 2-2 2-4"/></>,
    fox: <><path d="M5 9 3 3l6 3h6l6-3-2 6v5c0 4-3 7-7 7s-7-3-7-7V9Z"/><path d="m9 15 3 2 3-2M9 11h.01M15 11h.01"/></>,
  }

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.sparkles}</svg>
}

function AchievementVisual({ achievement, locked = false }: { achievement: Achievement; locked?: boolean }) {
  return <img className={locked ? 'badge-image is-locked' : 'badge-image'} src={achievement.image} alt="" loading="lazy" decoding="async" />
}

function AchievementModal({ achievement, isNew, onClose }: { achievement: Achievement; isNew: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
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
      <div className="achievement-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-rays" aria-hidden="true" />
        <p className="modal-kicker">{isNew ? 'Achievement unlocked' : 'Найденная реликвия'}</p>
        <div className="modal-badge"><AchievementVisual achievement={achievement} /></div>
        <h2>{achievement.title}</h2>
        <p>{achievement.description}</p>
        <button ref={closeRef} className="primary-button" type="button" onClick={onClose}>Продолжить путь</button>
      </div>
    </div>
  )
}

function MagicDiscoveryModal({ magic, onClose }: { magic: KitsuMagicDay; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
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
        <span className="magic-modal-kicker">Kitsunebi найден</span>
        <span className="fox-fire is-burning" aria-hidden="true"><i /></span>
        <h2>{magic.flameTitle}</h2>
        <p>{magic.discovery}</p>
        <button ref={closeRef} className="primary-button" type="button" onClick={onClose}>Сохранить огонёк</button>
      </div>
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

function ConfirmationDialog({ request, onCancel }: { request: ConfirmationRequest; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)

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
        <span className="section-kicker">Проверка от Кицу</span>
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
      aria-label={`${slot.dateLabel}. ${unlocked ? city : editable ? 'Глава закрыта. Для аварийного открытия удерживай пять секунд.' : 'Глава закрыта.'}`}
      {...hold.holdProps}
    >
      <small>{index + 1}</small>
      <strong>{slot.dateLabel.replace(' октября', '').replace(' сентября', ' сен')}</strong>
      {unlocked ? <span>{claimed ? <Icon name="check" size={12} /> : city}</span> : <Icon name="lock" size={12} />}
    </button>
  )
}

function TimelineCard({ item, complete, locked, editable, onToggle, onForceUnlock }: { item: TimelineItem; complete: boolean; locked: boolean; editable: boolean; onToggle: () => void; onForceUnlock: () => void }) {
  const holdTimer = useRef<number | undefined>(undefined)
  const holdOrigin = useRef({ x: 0, y: 0 })
  const [holding, setHolding] = useState(false)
  const guides = sceneGuides[item.id] ?? []

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
        aria-label={`${item.time}. ${item.title}. Сцена пока закрыта.${editable ? ' Для аварийного открытия удерживай пять секунд.' : ''}`}
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
            <span className="timeline-lock-note">{holding ? 'Не отпускай · Кицу снимает печать…' : 'Сцена пока скрыта'}</span>
          </span>
          <span className="details-chevron"><Icon name="lock" size={15} /></span>
        </div>
      </div>
    )
  }

  return (
    <details className={complete ? 'timeline-card is-complete' : 'timeline-card'}>
      <summary>
        <button className="stop-check" type="button" disabled={!editable} aria-label={complete ? 'Отметить как невыполненное' : 'Отметить как выполненное'} onClick={(event) => { event.preventDefault(); onToggle() }}>{complete && <Icon name="check" size={17} />}</button>
        <span className={`kind-icon kind-${item.kind}`}><Icon name={item.kind} size={18} /></span>
        <span className="timeline-title"><small>{item.time}</small><strong>{item.title}</strong></span>
        <span className="details-chevron"><Icon name="chevron" size={18} /></span>
      </summary>
      <div className="timeline-details">
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
      </div>
    </details>
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
        <span><small>Маршрут дня</small><strong>Интерактивная карта</strong><em>{open ? 'Свернуть карту' : 'Маркеры, линии и Google Maps'}</em></span>
        <Icon name="chevron" size={19} />
      </button>
      {open && (
        <div className="day-map-body">
          {day.mapNote && <p className="day-map-note"><Icon name="hint" size={16} /> {day.mapNote}</p>}
          <div className="day-map-frame"><iframe ref={frameRef} src={`${mapUrl}?embed=1&date=${mapDate}`} title={`Интерактивная карта · ${day.dateLabel}`} loading="lazy" allow="geolocation" onLoad={sendMapProgress} /></div>
          <div className="day-map-footer"><span>Точки закрываются только вместе со связанными сценами. Геолокация остаётся на устройстве.</span><a href={`${mapUrl}?date=${mapDate}&completed=${completedQuery}&routeScenes=${routeScenesQuery}&minimum=${minimumProgress}`} target="_blank" rel="noopener noreferrer">На весь экран →</a></div>
        </div>
      )}
    </section>
  )
}

function LockedDayContent({ editable, onForceUnlock }: { editable: boolean; onForceUnlock: () => void }) {
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
      aria-label={editable ? 'Закрытая глава. Для аварийного открытия удерживай пять секунд.' : 'Закрытая глава.'}
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
      <img src="/assets/kitsune-guide.webp" alt="Кицу — проводник путешествия" draggable="false" />
      <span className="section-kicker">Время Tokyo · UTC+9</span>
      <h2>{holding ? 'Кицу снимает печать…' : 'Кицу хранит секрет'}</h2>
      <p>{holding ? 'Не отпускай. Аварийный проход откроется через пять секунд.' : 'Каждая глава открывается в полночь по японскому времени. До этого маршрут и награда остаются под печатью.'}</p>
      <div className="locked-note"><Icon name="sparkles" size={18} /><span>Можно заранее смотреть коллекцию, но будущие бейджи не спойлерят приключение.</span></div>
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
      if (caught instanceof CloudUnavailableError && answer.trim().toLocaleLowerCase('ru-RU') === 'до') {
        onEnter('editor')
      } else {
        setError(caught instanceof CloudUnavailableError ? 'Сейчас нет связи с дневником. Попробуй ещё раз.' : 'Кицу не узнал ответ. Попробуй ещё раз.')
      }
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
              <span><strong>Я просто посмотреть</strong><small>Невероятное приключение Юльчоны и Эдюши</small></span>
            </button>
            <button type="button" className="editor-choice" onClick={() => setStep('editor')}>
              <Icon name="fox" size={21} />
              <span><strong>Я Юльчона</strong><small>Открыть мой полевой дневник</small></span>
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
  const today = useJapanToday()
  const japanHour = useJapanHour()
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [accessMode, setAccessMode] = useState<AccessMode | null>(loadAccessMode)
  const [accessChecking, setAccessChecking] = useState(() => loadAccessMode() === 'editor')
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('checking')
  const [cloudInitialized, setCloudInitialized] = useState(false)
  const [cloudRetry, setCloudRetry] = useState(0)
  const [view, setView] = useState<ViewName>('journey')
  const latestUnlocked = [...tripDays].reverse().find((day) => day.date <= today)
  const [selectedDate, setSelectedDate] = useState(latestUnlocked?.date ?? tripDays[0].date)
  const [riddleAnswers, setRiddleAnswers] = useState<Record<string, number>>({})
  const [modal, setModal] = useState<{ id: string; isNew: boolean; queue: string[] } | null>(null)
  const [magicModalDayId, setMagicModalDayId] = useState<string | null>(null)
  const [kitsuReaction, setKitsuReaction] = useState<{ id: number; message: string } | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null)
  const [photoError, setPhotoError] = useState('')
  const progressRef = useRef(progress)
  const lastCloudSnapshot = useRef(loadCloudSnapshot())
  const activePhotoUploads = useRef(new Set<string>())

  const canEdit = accessMode === 'editor'
  const {
    railRef: dayRailRef,
    dragging: dayRailDragging,
    dragProps: dayRailDragProps,
  } = useHorizontalDragScroll(selectedDate, view === 'journey' && Boolean(accessMode) && !accessChecking)
  const selectedDay = dayContentForDate(selectedDate, progress.fujiDate)
  const selectedMagic = kitsuMagicByDay[selectedDay.id]
  const selectedUnlocked = selectedDate <= today || progress.unlockedDays.includes(selectedDate)
  const selectedAchievement = selectedDay.achievementId
    ? achievements.find((item) => item.id === selectedDay.achievementId)
    : undefined
  const modalAchievement = modal ? achievements.find((item) => item.id === modal.id) : undefined
  const selectedStops = progress.checkedStops[selectedDay.id] ?? []
  const selectedUnlockedStops = progress.unlockedStops[selectedDay.id] ?? []
  const selectedAfternoonUnlocked = selectedDate < today || (selectedDate === today && japanHour >= 13)
  const selectedEveningUnlocked = selectedDate < today || (selectedDate === today && japanHour >= 19)
  const selectedClaimed = selectedDay.achievementId
    ? progress.claimed.includes(selectedDay.achievementId)
    : false
  const solvedRiddles = progress.solvedRiddles ?? []
  const selectedRiddleSolved = solvedRiddles.includes(selectedDay.id)
  const selectedRiddleRevealed = progress.reveals.includes(selectedDay.id)
  const selectedHintUsed = progress.hints.includes(selectedDay.id)
  const selectedAnswer = riddleAnswers[selectedDay.id]
    ?? (selectedRiddleSolved ? selectedDay.riddle.answer : undefined)
  const isCorrect = selectedAnswer === selectedDay.riddle.answer
  const rating = progress.ratings[selectedDay.id]
  const discoveredCount = progress.claimed.length
  const completedSideQuests = progress.sideQuests ?? []
  const previewMode = PREVIEW_MODE
  const knownFoxFires = progress.foxFires.filter((id) => Boolean(kitsuMagicByDay[id]))
  const selectedFoxFireFound = selectedMagic ? knownFoxFires.includes(selectedMagic.dayId) : false
  const selectedEncounterFound = selectedMagic ? progress.kitsuEncounters.includes(selectedMagic.dayId) : false
  const selectedNightMagicUnlocked = PREVIEW_MODE || selectedDate < today || (selectedDate === today && japanHour >= 19)
  const magicModal = magicModalDayId ? kitsuMagicByDay[magicModalDayId] : undefined
  const kitsuMood = japanHour < 10 ? 'sleepy' : japanHour < 18 ? 'adventurous' : 'cozy'
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
  const unlockedTalismans = new Set<string>([
    ...(knownFoxFires.length >= 1 ? ['tabiji'] : []),
    ...(knownFoxFires.includes('shirahama') || progress.claimed.includes('touch-the-pacific') ? ['umi'] : []),
    ...(knownFoxFires.includes('fushimi') || progress.claimed.includes('a-thousand-gates') ? ['inari'] : []),
    ...(knownFoxFires.includes('fuji') || progress.claimed.includes('fuji-found') ? ['fuji'] : []),
    ...(Object.keys(progress.photos).length >= 5 ? ['kioku'] : []),
    ...(progress.finaleOpened ? ['okaeri'] : []),
  ])
  const bestRatingEntry = Object.entries(progress.ratings).sort(([, a], [, b]) => b - a)[0]
  const bestRatedDay = bestRatingEntry ? tripDays.find((slot) => dayContentForDate(slot.date, progress.fujiDate).id === bestRatingEntry[0]) : undefined

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    if (!kitsuReaction) return
    const timer = window.setTimeout(() => setKitsuReaction((current) => current?.id === kitsuReaction.id ? null : current), 4_800)
    return () => window.clearTimeout(timer)
  }, [kitsuReaction])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // The photo handler surfaces storage errors where the user can act on them.
    }
  }, [progress])

  useEffect(() => {
    if (accessMode !== 'editor') return

    let cancelled = false
    void checkEditorSession()
      .then((session) => {
        if (cancelled || session.editor) return
        forgetAccessMode()
        setAccessMode(null)
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof CloudUnavailableError) setCloudStatus('offline')
      })
      .finally(() => {
        if (!cancelled) setAccessChecking(false)
      })

    return () => { cancelled = true }
  }, [accessMode])

  useEffect(() => {
    if (!accessMode || accessChecking) return
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
            setProgress(remoteProgress)
          } else if (initial) {
            const localProgress = progressRef.current
            const localSnapshot = JSON.stringify(progressForCloud(localProgress))
            const hasPendingLocalChanges = lastCloudSnapshot.current !== ''
              && localSnapshot !== lastCloudSnapshot.current
            const pendingPhotos = Object.fromEntries(
              Object.entries(localProgress.photos).filter(([, photo]) => photo.startsWith('data:image/')),
            )
            const nextProgress = hasPendingLocalChanges
              ? { ...localProgress, photos: { ...remoteProgress.photos, ...pendingPhotos } }
              : { ...remoteProgress, photos: { ...remoteProgress.photos, ...pendingPhotos } }

            if (!hasPendingLocalChanges) rememberCloudSnapshot(remoteSnapshot)
            progressRef.current = nextProgress
            setProgress(nextProgress)
          }
        } else if (accessMode === 'editor' && initial) {
          const localProgress = progressRef.current
          const snapshot = JSON.stringify(progressForCloud(localProgress))
          await saveSharedProgress(progressForCloud(localProgress))
          if (cancelled) return
          rememberCloudSnapshot(snapshot)
        } else if (accessMode === 'viewer') {
          const remoteProgress = normalizeProgress(null)
          const snapshot = JSON.stringify(progressForCloud(remoteProgress))
          rememberCloudSnapshot(snapshot)
          progressRef.current = remoteProgress
          setProgress(remoteProgress)
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
      if (document.visibilityState === 'visible' && accessMode === 'viewer') void pullProgress(false)
    }
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [accessMode, accessChecking])

  useEffect(() => {
    if (accessMode !== 'editor' || accessChecking || !cloudInitialized) return
    const timer = window.setTimeout(() => {
      const current = progressRef.current
      const cloudProgress = progressForCloud(current)
      const snapshot = JSON.stringify(cloudProgress)
      const pendingPhotos = Object.entries(current.photos).filter(([, photo]) => photo.startsWith('data:image/'))
      if (snapshot === lastCloudSnapshot.current && pendingPhotos.length === 0) return

      const sync = async () => {
        setCloudStatus('checking')
        try {
          if (snapshot !== lastCloudSnapshot.current) {
            await saveSharedProgress(cloudProgress)
            lastCloudSnapshot.current = snapshot
            saveCloudSnapshot(snapshot)
          }
          for (const [dayId, photo] of pendingPhotos) {
            if (activePhotoUploads.current.has(dayId)) continue
            activePhotoUploads.current.add(dayId)
            try {
              const url = await uploadSharedPhoto(dayId, photo)
              setProgress((latest) => latest.photos[dayId] === photo
                ? { ...latest, photos: { ...latest.photos, [dayId]: url } }
                : latest)
            } finally {
              activePhotoUploads.current.delete(dayId)
            }
          }
          setCloudStatus('synced')
        } catch (error) {
          setCloudStatus(error instanceof CloudUnavailableError ? 'offline' : 'error')
        }
      }
      void sync()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [progress, accessMode, accessChecking, cloudInitialized, cloudRetry])

  useEffect(() => {
    if (accessMode !== 'editor' || accessChecking) return
    const interval = window.setInterval(() => setCloudRetry((value) => value + 1), 30_000)
    return () => window.clearInterval(interval)
  }, [accessMode, accessChecking])

  useEffect(() => {
    if (!canEdit) return
    const claimed = new Set(progress.claimed)
    const unlock = (condition: boolean, id: string) => { if (condition && !claimed.has(id)) claimed.add(id) }
    const stopDone = (dayId: string, stopId: string) => (progress.checkedStops[dayId] ?? []).includes(stopId)
    unlock(progress.ramen, 'ramen-initiation')
    unlock(progress.konbini.length >= 3, 'konbini-connoisseur')
    unlock(progress.stamps.length >= 5, 'stamp-hunter')
    unlock(Object.values(progress.ratings).some((value) => value === 10), 'perfect-day')
    unlock(Object.keys(progress.photos).length >= 5, 'memory-keeper')
    unlock(['another-world', 'kyoto-after-dark', 'hello-tokyo'].every((id) => claimed.has(id)), 'night-owl')
    unlock(['welcome-to-japan', 'the-old-capital', 'hello-tokyo'].every((id) => claimed.has(id)), 'three-cities')
    unlock(claimed.has('hello-tokyo'), 'no-spoilers')
    unlock(progress.hints.length >= 5, 'curious-fox')
    unlock((progress.solvedRiddles ?? []).length >= 1, 'field-researcher')
    unlock((progress.solvedRiddles ?? []).length >= 5, 'keen-eye')
    unlock(tripDays.filter((day) => day.riddle.location).every((day) => (progress.solvedRiddles ?? []).includes(day.id)), 'kitsus-equal')
    unlock(kitsuMagicDays.every((day) => progress.foxFires.includes(day.dayId)), 'foxfire-constellation')
    unlock((progress.sideQuests ?? []).length >= 1, 'side-quest-accepted')
    unlock((progress.sideQuests ?? []).includes('manhole-hunter'), 'manhole-hunter')
    unlock((progress.sideQuests ?? []).includes('gachapon-oracle'), 'capsule-of-fate')
    unlock((progress.sideQuests ?? []).includes('paper-fortune'), 'fortune-found')
    unlock(sideQuests.every((quest) => (progress.sideQuests ?? []).includes(quest.id)), 'wandering-legend')
    unlock(stopDone('hello-tokyo', 'shiba') && stopDone('hello-tokyo', 'tower'), 'weather-child')
    unlock(stopDone('shibuya-story', 'jujutsu-route'), 'shibuya-incident')
    unlock(stopDone('shibuya-story', 'suga-steps'), 'i-remember-you')
    unlock(stopDone('ginza-akihabara', 'kanda-myojin-anime') && stopDone('ginza-akihabara', 'steins-gate-line'), 'el-psy-kongroo')
    unlock(claimed.size >= 15, 'japan-collector')
    unlock(achievements.filter((item) => item.id !== 'completionist').every((item) => claimed.has(item.id)), 'completionist')
    const next = [...claimed]
    const newlyUnlocked = next.filter((id) => !progress.claimed.includes(id))
    if (newlyUnlocked.length > 0) {
      const timer = window.setTimeout(() => {
        setProgress((current) => ({ ...current, claimed: next }))
        setModal((current) => {
          if (!current) return { id: newlyUnlocked[0], isNew: true, queue: newlyUnlocked.slice(1) }
          return { ...current, queue: [...current.queue, ...newlyUnlocked] }
        })
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [progress, canEdit])

  const showKitsuReaction = (message: string) => setKitsuReaction((current) => ({ id: (current?.id ?? 0) + 1, message }))

  const isLetterUnlocked = (letter: (typeof sealedLetters)[number]) => {
    if (PREVIEW_MODE) return true
    return 'fireCount' in letter.unlock
      ? knownFoxFires.length >= letter.unlock.fireCount
      : knownFoxFires.includes(letter.unlock.dayId)
  }

  const findMagicSlot = (dayId: string) => tripDays.find((slot) => dayContentForDate(slot.date, progress.fujiDate).id === dayId)

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

  const findNightEncounter = (magic: KitsuMagicDay) => {
    if (!canEdit || !magic.nightEncounter || progress.kitsuEncounters.includes(magic.dayId)) return
    setProgress((current) => current.kitsuEncounters.includes(magic.dayId)
      ? current
      : { ...current, kitsuEncounters: [...current.kitsuEncounters, magic.dayId] })
    showKitsuReaction(magic.nightEncounter.message)
  }

  const openLetter = (letter: (typeof sealedLetters)[number]) => {
    if (!canEdit || !isLetterUnlocked(letter) || progress.openedLetters.includes(letter.id)) return
    setProgress((current) => current.openedLetters.includes(letter.id)
      ? current
      : { ...current, openedLetters: [...current.openedLetters, letter.id] })
    showKitsuReaction('Печать стала тёплой и рассыпалась золотой пылью. Письмо теперь останется открытым.')
  }

  const openFinale = () => {
    if (!canEdit || !finaleReady || progress.finaleOpened) return
    setProgress((current) => ({ ...current, finaleOpened: true }))
    showKitsuReaction('Все найденные огни поднялись над дневником. Финальная страница открыта.')
  }

  const claimAchievement = (id: string) => {
    if (progress.claimed.includes(id)) return
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
    setProgress((current) => {
      const stops = current.checkedStops[dayId] ?? []
      const nextStops = stops.includes(stopId) ? stops.filter((id) => id !== stopId) : [...stops, stopId]
      return { ...current, checkedStops: { ...current.checkedStops, [dayId]: nextStops } }
    })
  }

  const forceUnlockStop = (dayId: string, stopId: string) => {
    setProgress((current) => {
      const unlocked = current.unlockedStops[dayId] ?? []
      if (unlocked.includes(stopId)) return current
      return { ...current, unlockedStops: { ...current.unlockedStops, [dayId]: [...unlocked, stopId] } }
    })
  }

  const forceUnlockDay = (date: string) => {
    setProgress((current) => current.unlockedDays.includes(date)
      ? current
      : { ...current, unlockedDays: [...current.unlockedDays, date] })
  }

  const toggleStop = (dayId: string, stopId: string, timeUnlocked = false) => {
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
        title: 'Миссия точно выполнена?',
        description: 'Эта отметка завершит задание и навсегда откроет секретную ачивку на этом телефоне.',
        confirmLabel: 'Да, выполнено',
        onConfirm: () => applyStopToggle(dayId, stopId),
      })
      return
    }

    applyStopToggle(dayId, stopId)
  }

  const addHint = (dayId: string) => {
    setProgress((current) => current.hints.includes(dayId) ? current : { ...current, hints: [...current.hints, dayId] })
  }

  const revealAnswer = (day: TripDay) => {
    setProgress((current) => current.reveals.includes(day.id) ? current : { ...current, reveals: [...current.reveals, day.id] })
    setRiddleAnswers((current) => ({ ...current, [day.id]: day.riddle.answer }))
  }

  const answerRiddle = (day: TripDay, answer: number) => {
    setRiddleAnswers((current) => ({ ...current, [day.id]: answer }))
    if (answer !== day.riddle.answer || !day.riddle.location) return
    setProgress((current) => {
      const solved = current.solvedRiddles ?? []
      return solved.includes(day.id) ? current : { ...current, solvedRiddles: [...solved, day.id] }
    })
    showKitsuReaction('Правильная улика! Кицу довольно щурится: ты заметила то, мимо чего легко пройти.')
  }

  const handlePhoto = async (file: File | undefined, dayId: string) => {
    if (!file) return
    setPhotoError('')
    try {
      const photo = await compressPhoto(file)
      setProgress((current) => ({ ...current, photos: { ...current.photos, [dayId]: photo } }))
      showKitsuReaction('Этот кадр пахнет сегодняшним днём. Кицу спрятал его в плёнку памяти.')
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Не удалось сохранить фото')
    }
  }

  const applyListToggle = (field: 'stamps' | 'sideQuests' | 'konbini', id: string) => {
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
    const values = progress[field] ?? []
    if (values.includes(id)) {
      applyListToggle(field, id)
      return
    }

    const specialSideQuestAchievements: Record<string, string> = {
      'manhole-hunter': 'manhole-hunter',
      'gachapon-oracle': 'capsule-of-fate',
      'paper-fortune': 'fortune-found',
    }
    const completesAllSideQuests = field === 'sideQuests'
      && sideQuests.every((quest) => quest.id === id || values.includes(quest.id))
    const opensAchievement = (
      field === 'stamps' && values.length === 4 && !progress.claimed.includes('stamp-hunter')
    ) || (
      field === 'konbini' && values.length === 2 && !progress.claimed.includes('konbini-connoisseur')
    ) || (
      field === 'sideQuests' && (
        !progress.claimed.includes('side-quest-accepted')
        || (Boolean(specialSideQuestAchievements[id]) && !progress.claimed.includes(specialSideQuestAchievements[id]))
        || (completesAllSideQuests && !progress.claimed.includes('wandering-legend'))
      )
    )

    if (opensAchievement) {
      setConfirmation({
        title: 'Засчитать находку?',
        description: 'Эта отметка откроет ачивку. Саму отметку можно снять, но полученная награда уже останется в коллекции.',
        confirmLabel: 'Да, засчитать',
        onConfirm: () => applyListToggle(field, id),
      })
      return
    }

    applyListToggle(field, id)
  }

  const requestRiddleAnswer = (day: TripDay, answer: number) => {
    if (solvedRiddles.includes(day.id)) return
    setConfirmation({
      title: 'Проверить этот вариант?',
      description: `Выбран ответ «${day.riddle.options[answer]}». Если он верный, решение сохранится и сможет открыть ачивку.`,
      confirmLabel: 'Проверить',
      onConfirm: () => answerRiddle(day, answer),
    })
  }

  const requestChapterClaim = (id: string) => {
    setConfirmation({
      title: 'Забрать награду главы?',
      description: 'Подтверди, что реальная миссия выполнена. Полученную ачивку нельзя будет убрать из коллекции.',
      confirmLabel: 'Да, забрать',
      onConfirm: () => claimAchievement(id),
    })
  }

  const toggleRamen = () => {
    if (progress.ramen || progress.claimed.includes('ramen-initiation')) {
      setProgress((current) => ({ ...current, ramen: !current.ramen }))
      return
    }
    setConfirmation({
      title: 'Первая миска съедена?',
      description: 'Эта отметка навсегда откроет ачивку за первый ramen поездки.',
      confirmLabel: 'Да, съедена',
      onConfirm: () => setProgress((current) => ({ ...current, ramen: true })),
    })
  }

  const updateRating = (value: number) => {
    const save = () => {
      setProgress((current) => ({ ...current, ratings: { ...current.ratings, [selectedDay.id]: value } }))
      if (value === 10) showKitsuReaction('Легендарный день! Кицу поставил рядом маленькую невидимую звезду.')
    }
    if (value === 10 && !progress.claimed.includes('perfect-day')) {
      setConfirmation({
        title: 'День правда на 10 из 10?',
        description: 'Максимальная оценка навсегда откроет секретную ачивку.',
        confirmLabel: 'Точно 10/10',
        onConfirm: save,
      })
      return
    }
    save()
  }

  const selectPhoto = (file: File | undefined, dayId: string) => {
    if (!file) return
    const isNewDayPhoto = !progress.photos[dayId]
    const opensAchievement = isNewDayPhoto
      && Object.keys(progress.photos).length === 4
      && !progress.claimed.includes('memory-keeper')
    if (opensAchievement) {
      setConfirmation({
        title: 'Сохранить пятую фотографию?',
        description: 'Она появится в общем дневнике и откроет ачивку хранительницы воспоминаний.',
        confirmLabel: 'Сохранить фото',
        onConfirm: () => void handlePhoto(file, dayId),
      })
      return
    }
    void handlePhoto(file, dayId)
  }

  const enterAccessMode = (mode: AccessMode) => {
    rememberAccessMode(mode)
    setAccessChecking(mode === 'editor')
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
          <button className={`access-mode-token is-${cloudStatus}`} type="button" onClick={chooseAnotherMode} aria-label={accessMode === 'editor' ? 'Режим Юльчоны. Нажми, чтобы сменить режим.' : 'Режим зрителя. Нажми, чтобы сменить режим.'}><Icon name={accessMode === 'editor' ? 'fox' : 'eye'} size={16} /><span /></button>
          <button className="progress-token" type="button" onClick={() => setView('collection')} aria-label={`${discoveredCount} из ${achievements.length} достижений`}><Icon name="collection" size={17} /><span>{discoveredCount}/{achievements.length}</span></button>
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
              aria-label={selectedUnlocked ? undefined : canEdit ? `Глава ${selectedDay.dateLabel} закрыта. Для аварийного открытия удерживай пять секунд.` : `Глава ${selectedDay.dateLabel} закрыта.`}
              {...(!selectedUnlocked && canEdit ? lockedHeroHold.holdProps : {})}
            >
              <div className="hero-shade" />
              <div className="hero-content">
                {previewMode && <span className="preview-pill">Preview · Japan {today}</span>}
                {!selectedUnlocked && <span className="hero-lock"><Icon name="lock" size={18} /> До открытия главы</span>}
                <p>{selectedUnlocked ? selectedDay.eyebrow : 'История ещё спит'}</p>
                <h1>{selectedUnlocked ? selectedDay.title : lockedHeroHold.holding ? 'Открываю…' : `${daysUntil(selectedDate)} дн.`}</h1>
                <span>{selectedUnlocked ? selectedDay.subtitle : lockedHeroHold.holding ? 'Не отпускай · Кицу снимает печать' : `Глава откроется ${selectedDay.dateLabel} по времени Японии`}</span>
              </div>
            </section>

            <section className="day-rail-section" aria-label="Дни путешествия">
              <div ref={dayRailRef} className={dayRailDragging ? 'day-rail is-dragging' : 'day-rail'} aria-label="Лента дней" {...dayRailDragProps}>
                {tripDays.map((slot, index) => {
                  const content = dayContentForDate(slot.date, progress.fujiDate)
                  const unlocked = slot.date <= today || progress.unlockedDays.includes(slot.date)
                  const active = slot.date === selectedDate
                  const claimed = content.achievementId ? progress.claimed.includes(content.achievementId) : false
                  return <JourneyDayChip key={slot.date} slot={slot} index={index} city={content.city} active={active} unlocked={unlocked} claimed={claimed} editable={canEdit} onSelect={() => setSelectedDate(slot.date)} onForceUnlock={() => { forceUnlockDay(slot.date); setSelectedDate(slot.date) }} />
                })}
              </div>
            </section>

            {selectedUnlocked ? (
              <div className="screen-content day-content">
                <section className="chapter-heading">
                  <div><span className="section-kicker">{selectedDay.dateLabel} · {selectedDay.city}</span><h2>Приключение дня</h2></div>
                  <div className="day-progress"><strong>{selectedStops.length}/{selectedDay.timeline.length}</strong><small>сцен</small></div>
                </section>

                {selectedMagic && (
                  <section className={selectedFoxFireFound ? 'paper-card kitsu-whisper-card is-found' : 'paper-card kitsu-whisper-card'} style={{ '--flame-color': selectedMagic.flameColor } as React.CSSProperties}>
                    <div className="paw-trail" aria-hidden="true"><i /><i /><i /></div>
                    <div className="kitsu-whisper-heading">
                      <div><span className="section-kicker">Утренний шёпот</span><h2>Кицу оставил знак</h2></div>
                      <span className={selectedFoxFireFound ? 'fox-fire is-burning' : 'fox-fire'} aria-hidden="true"><i /></span>
                    </div>
                    <blockquote>«{selectedMagic.whisper}»</blockquote>
                    <div className="magic-clue"><Icon name="sparkles" size={18} /><div><strong>{selectedFoxFireFound ? selectedMagic.flameTitle : 'Маленькая миссия'}</strong><p>{selectedFoxFireFound ? selectedMagic.discovery : selectedMagic.clue}</p></div></div>
                    <button type="button" className={selectedFoxFireFound ? 'magic-found-button' : 'magic-find-button'} disabled={selectedFoxFireFound || !canEdit} onClick={() => discoverFoxFire(selectedMagic)}>
                      {selectedFoxFireFound ? <><Icon name="check" size={17} /> Огонёк сохранён</> : canEdit ? selectedMagic.actionLabel : 'Знак ищет Юльчона'}
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
                    return <TimelineCard key={item.id} item={item} complete={complete} locked={!complete && !accessible} editable={canEdit} onToggle={() => toggleStop(selectedDay.id, item.id, accessible)} onForceUnlock={() => forceUnlockStop(selectedDay.id, item.id)} />
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
                      <span><small>{selectedEncounterFound ? 'Редкая встреча сохранена' : 'Кто-то прячется рядом…'}</small><strong>{selectedEncounterFound ? selectedMagic.nightEncounter.title : selectedMagic.nightEncounter.actionLabel}</strong><em>{selectedEncounterFound ? selectedMagic.nightEncounter.message : 'Нажми, пока рыжий хвост снова не исчез.'}</em></span>
                      <Icon name={selectedEncounterFound ? 'check' : 'eye'} size={19} />
                    </button>
                  ) : (
                    <div className="kitsu-night-locked"><Icon name="lock" size={16} /><span>После 19:00 здесь может появиться кто-то ещё</span></div>
                  )
                )}

                <section className="paper-card riddle-card">
                  <div className="card-label"><Icon name="quest" size={18} /> Загадка дня</div>
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
                      const answerClass = chosen ? (index === selectedDay.riddle.answer ? ' is-correct' : ' is-wrong') : ''
                      const answerLocked = selectedRiddleSolved || !canEdit
                      return <button key={option} type="button" className={`answer-button${answerClass}`} disabled={answerLocked} onClick={() => requestRiddleAnswer(selectedDay, index)}>{option}</button>
                    })}
                  </div>
                  {selectedRiddleRevealed && !selectedRiddleSolved && <p className="reveal-note">Кицу подсветил ответ. Нажми на правильный вариант, чтобы засчитать загадку.</p>}
                  {isCorrect && <p className="answer-note"><Icon name="check" size={16} /> {selectedDay.riddle.explanation}</p>}
                  {selectedAnswer !== undefined && !isCorrect && <p className="try-again">Почти. Кицу разрешает попробовать ещё раз.</p>}
                  {selectedHintUsed && <p className="hint-text">Подсказка: {selectedDay.riddle.hint}</p>}
                  <div className="riddle-actions">
                    <button type="button" className="text-button" disabled={!canEdit || selectedHintUsed || selectedRiddleSolved || selectedRiddleRevealed} onClick={() => addHint(selectedDay.id)}><Icon name="hint" size={17} /> {selectedHintUsed ? 'Подсказка открыта' : selectedRiddleSolved ? 'Разгадано' : 'Подсказка'}</button>
                    <button type="button" className="text-button muted" disabled={!canEdit || selectedRiddleRevealed || selectedRiddleSolved} onClick={() => revealAnswer(selectedDay)}><Icon name="eye" size={17} /> {selectedRiddleRevealed ? 'Ответ открыт' : selectedRiddleSolved ? 'Разгадано' : 'Reveal answer'}</button>
                  </div>
                </section>

                {selectedAchievement && (
                  <section className={selectedClaimed ? 'paper-card claim-card is-claimed' : 'paper-card claim-card'}>
                    <div className="claim-copy">
                      <span className="section-kicker">Награда главы</span>
                      <h3>{selectedClaimed ? selectedAchievement.title : 'Печать ждёт тебя'}</h3>
                      <p>{selectedClaimed ? selectedAchievement.description : 'Когда реальная миссия выполнена, забери награду. Никаких проверок — Кицу тебе верит.'}</p>
                    </div>
                    <div className="claim-badge"><AchievementVisual achievement={selectedAchievement} locked={!selectedClaimed} /></div>
                    <button type="button" className={selectedClaimed ? 'claimed-button' : 'primary-button'} disabled={selectedClaimed || !canEdit} onClick={() => requestChapterClaim(selectedAchievement.id)}>
                      {selectedClaimed ? <><Icon name="check" size={18} /> Получено</> : canEdit ? selectedDay.claimLabel : 'Награду заберёт Юльчона'}
                    </button>
                  </section>
                )}

                <section className="paper-card memory-card">
                  <div className="memory-heading"><div><span className="section-kicker">Day recap</span><h3>Сохранить этот день</h3></div><Icon name="camera" size={25} /></div>
                  {progress.photos[selectedDay.id] ? (
                    <div className="photo-preview">
                      <img src={progress.photos[selectedDay.id]} alt={`Фото дня · ${selectedDay.dateLabel}`} />
                      {canEdit && <label className="photo-change">Заменить<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; selectPhoto(file, selectedDay.id) }} /></label>}
                    </div>
                  ) : canEdit ? (
                    <label className="photo-drop"><Icon name="camera" size={22} /><span>Добавить Photo of the Day</span><small>Фото уменьшится и появится в общем дневнике</small><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; selectPhoto(file, selectedDay.id) }} /></label>
                  ) : (
                    <div className="photo-drop is-readonly"><Icon name="camera" size={22} /><span>Фото дня ещё впереди</span><small>Здесь появится кадр Юльчоны</small></div>
                  )}
                  {photoError && <p className="error-message">{photoError}</p>}
                  <div className="rating-row"><span>Как прошёл день?</span><strong>{rating ? `${rating}/10` : '—'}</strong></div>
                  <div id="day-rating" className="rating-options" role="group" aria-label="Оценка дня от 1 до 10">
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                      <button key={value} type="button" className={rating === value ? 'rating-option is-selected' : 'rating-option'} aria-pressed={rating === value} disabled={!canEdit} onClick={() => updateRating(value)}>{value}</button>
                    ))}
                  </div>
                  <div className="rating-scale"><span>тихо</span><span>легендарно</span></div>
                </section>
              </div>
            ) : (
              <LockedDayContent editable={canEdit} onForceUnlock={() => forceUnlockDay(selectedDate)} />
            )}
          </>
        )}

        {view === 'collection' && (
          <div className="screen-content collection-screen">
            <section className="page-intro"><span className="section-kicker">Memories</span><h1>Коллекция пути</h1><p>Будущие главы скрыты. Секретные награды покажут себя только после находки.</p></section>
            <section className="collection-progress">
              <div><span>Открыто наград</span><strong>{discoveredCount}<small> / {achievements.length}</small></strong></div>
              <div className="progress-line"><span style={{ width: `${(discoveredCount / achievements.length) * 100}%` }} /></div>
            </section>
            <section className="badge-grid">
              {achievements.map((achievement) => {
                const unlocked = progress.claimed.includes(achievement.id)
                const effectiveUnlockDate = progress.fujiDate === '2026-10-11'
                  ? achievement.id === 'fuji-found'
                    ? '2026-10-11'
                    : achievement.id === 'lost-in-tokyo'
                      ? '2026-10-09'
                      : achievement.unlockDate
                  : achievement.unlockDate
                const futureStory = achievement.type === 'story' && effectiveUnlockDate && effectiveUnlockDate > today
                const conceal = !unlocked
                return (
                  <button key={achievement.id} type="button" className={unlocked ? 'badge-tile is-unlocked' : 'badge-tile'} disabled={!unlocked} onClick={() => setModal({ id: achievement.id, isNew: false, queue: [] })}>
                    <span className="badge-frame"><AchievementVisual achievement={achievement} locked={!unlocked} />{!unlocked && <span className="badge-lock"><Icon name="lock" size={16} /></span>}</span>
                    <strong>{conceal ? '???' : achievement.title}</strong>
                    <small>{unlocked ? achievement.description : futureStory ? 'Будущая глава' : 'Пока скрыто'}</small>
                  </button>
                )
              })}
            </section>
          </div>
        )}

        {view === 'passport' && (
          <div className="screen-content passport-screen">
            <section className="page-intro passport-intro">
              <div><span className="section-kicker">Travel Passport</span><h1>Полевой дневник</h1><p>Маленькие отметки, которые превращают маршрут в историю.</p></div>
              <img src="/assets/kitsune-guide.webp" alt="" />
            </section>

            <section className="paper-card fuji-switcher">
              <div className="card-label"><Icon name="place" size={18} /> План Fuji</div>
              <h3>Когда охотимся за горой?</h3>
              <p>Если облачно, контент Fuji и награда переедут вместе.</p>
              <div className="segmented-control">
                <button type="button" disabled={!canEdit} className={progress.fujiDate === '2026-10-09' ? 'is-active' : ''} onClick={() => setProgress((current) => ({ ...current, fujiDate: '2026-10-09' }))}>9 окт</button>
                <button type="button" disabled={!canEdit} className={progress.fujiDate === '2026-10-11' ? 'is-active' : ''} onClick={() => setProgress((current) => ({ ...current, fujiDate: '2026-10-11' }))}>11 окт</button>
              </div>
            </section>

            <section className="passport-section">
              <div className="section-title"><div><span className="section-kicker">Eki stamp</span><h2>Пять печатей</h2></div><strong>{progress.stamps.length}/5</strong></div>
              <div className="stamp-system-guide">
                <div>
                  <strong>Eki stamp</strong>
                  <p>Ставишь сама в туристический блокнот — не в загранпаспорт. Ниже отмечаешь находку в приложении.</p>
                </div>
                <div>
                  <strong>Goshuin</strong>
                  <p>Служитель оформляет в отдельной goshuincho. В эти пять станционных печатей он не входит.</p>
                </div>
              </div>
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
              <h3>Вкусные секреты</h3>
              <button type="button" disabled={!canEdit} className={progress.ramen ? 'quest-toggle is-complete' : 'quest-toggle'} onClick={toggleRamen}>
                <span className="quest-toggle-icon"><Icon name="bowl" size={23} /></span><span><strong>Первый ramen</strong><small>Отметить после первой миски</small></span><span className="mini-check">{progress.ramen && <Icon name="check" size={16} />}</span>
              </button>
              <p className="mini-label">Три разных konbini</p>
              <div className="konbini-grid">
                {['7-Eleven', 'FamilyMart', 'Lawson'].map((shop) => <button key={shop} type="button" disabled={!canEdit} className={progress.konbini.includes(shop) ? 'is-active' : ''} onClick={() => toggleListValue('konbini', shop)}>{progress.konbini.includes(shop) && <Icon name="check" size={14} />}{shop}</button>)}
              </div>
              <div className="side-quest-heading">
                <p className="mini-label">Миссии без маршрута</p>
                <strong>{completedSideQuests.length}/{sideQuests.length}</strong>
              </div>
              <p className="side-quest-note">Никаких дедлайнов — отмечай случайные находки в любой день.</p>
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
            </section>

            <section className="passport-section photo-journal">
              <div className="section-title"><div><span className="section-kicker">Photo of the Day</span><h2>Плёнка памяти</h2></div><strong>{Object.keys(progress.photos).length}</strong></div>
              {Object.keys(progress.photos).length > 0 ? (
                <div className="photo-strip">{tripDays.map((slot) => dayContentForDate(slot.date, progress.fujiDate)).filter((day) => progress.photos[day.id]).map((day) => <button key={`${day.date}-${day.id}`} type="button" onClick={() => { setSelectedDate(day.date); setView('journey'); window.scrollTo({ top: 0 }) }}><img src={progress.photos[day.id]} alt={day.dateLabel} /><span>{day.dateLabel}</span></button>)}</div>
              ) : <div className="empty-journal"><Icon name="camera" size={25} /><p>Первое фото появится здесь после дневного recap.</p></div>}
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
              <img src="/assets/kitsune-guide.webp" alt="Кицу — лисий проводник путешествия" />
            </section>

            <section className="kitsu-magic-section">
              <div className="section-title"><div><span className="section-kicker">Kitsunebi</span><h2>Созвездие лисьих огней</h2></div><strong>{knownFoxFires.length}/{kitsuMagicDays.length}</strong></div>
              <p className="kitsu-section-note">Каждый огонь появляется после одной настоящей маленькой находки. Ничего не нужно выполнять на 100%.</p>
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
              <div className="encounter-counter"><Icon name="fox" size={18} /><span>Редкие встречи после заката</span><strong>{progress.kitsuEncounters.length}/{kitsuMagicDays.filter((day) => day.nightEncounter).length}</strong></div>
            </section>

            <section className="kitsu-magic-section">
              <div className="section-title"><div><span className="section-kicker">Omamori</span><h2>Талисманы пути</h2></div><strong>{unlockedTalismans.size}/{kitsuTalismans.length}</strong></div>
              <div className="talisman-grid">
                {kitsuTalismans.map((talisman) => {
                  const unlocked = unlockedTalismans.has(talisman.id)
                  return <article key={talisman.id} className={unlocked ? 'talisman is-unlocked' : 'talisman'}><span>{unlocked ? talisman.symbol : '封'}</span><div><strong>{unlocked ? talisman.title : 'Запечатано'}</strong><p>{unlocked ? talisman.description : 'Талисман откроется в подходящий момент пути.'}</p></div></article>
                })}
              </div>
            </section>

            <section className="kitsu-magic-section letter-section">
              <div className="section-title"><div><span className="section-kicker">Запечатанные слова</span><h2>Пять писем по дороге</h2></div>{canEdit ? <strong>{progress.openedLetters.length}/{sealedLetters.length}</strong> : <Icon name="lock" size={18} />}</div>
              {canEdit ? (
                <div className="letter-stack">
                  {sealedLetters.map((letter) => {
                    const unlocked = isLetterUnlocked(letter)
                    const opened = progress.openedLetters.includes(letter.id)
                    return (
                      <article key={letter.id} className={opened ? 'sealed-letter is-open' : unlocked ? 'sealed-letter is-ready' : 'sealed-letter'}>
                        <span className="letter-seal">{opened ? '心' : letter.seal}</span>
                        <div><small>{opened ? 'Письмо открыто' : unlocked ? 'Печать стала тёплой' : 'Пока запечатано'}</small><h3>{opened || unlocked ? letter.title : 'Слова из будущей главы'}</h3><p>{opened ? letter.text : letter.preview}</p></div>
                        {!opened && <button type="button" disabled={!unlocked} onClick={() => openLetter(letter)}>{unlocked ? 'Открыть' : <Icon name="lock" size={15} />}</button>}
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="private-letter-lock">
                  <span><Icon name="lock" size={23} /></span>
                  <div><strong>Личные письма Юльчоны</strong><p>Кицу не раскрывает чужие письма. Их сможет прочитать только хозяйка этой истории.</p></div>
                </div>
              )}
            </section>

            <section className={progress.finaleOpened ? 'kitsu-finale is-open' : 'kitsu-finale'}>
              <div className="finale-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
              <span className="section-kicker">Финал созвездия</span>
              {!finaleReady ? (
                <><Icon name="lock" size={28} /><h2>Последняя страница спит</h2><p>Кицу откроет её 13 октября, когда дорога домой станет частью истории.</p></>
              ) : !progress.finaleOpened ? (
                <><Icon name="sparkles" size={30} /><h2>Огни готовы собраться вместе</h2><p>Финал не требует идеального результата. Кицу сложит историю из того, что действительно случилось.</p><button type="button" className="finale-open-button" disabled={!canEdit} onClick={openFinale}>{canEdit ? 'Открыть коробку воспоминаний' : 'Финал откроет Юльчона'}</button></>
              ) : (
                <>
                  <span className="finale-kanji">おかえり</span>
                  <h2>С возвращением из вашей Японии</h2>
                  <p>Кицу собрал не идеальный отчёт, а живую историю — ровно такую, какой она случилась.</p>
                  <div className="finale-stats">
                    <span><strong>{knownFoxFires.length}</strong><small>лисьих огней</small></span>
                    <span><strong>{Object.keys(progress.photos).length}</strong><small>кадров памяти</small></span>
                    <span><strong>{progress.stamps.length}</strong><small>печатей</small></span>
                    <span><strong>{progress.kitsuEncounters.length}</strong><small>встреч с Кицу</small></span>
                  </div>
                  {bestRatingEntry && <p className="finale-favorite">Самая высокая оценка — <strong>{bestRatedDay?.dateLabel ?? 'один особенный день'} · {bestRatingEntry[1]}/10</strong></p>}
                  <blockquote>«Спасибо за эту Японию — с усталыми ногами, случайными находками и моментами, которых не было ни в одном плане. У этой истории будет продолжение.»</blockquote>
                </>
              )}
            </section>

            <section className="paper-card kitsu-story">
              <div className="card-label"><Icon name="fox" size={18} /> Кто такой Кицу</div>
              <h2>Хранитель этой истории</h2>
              <p>Кицу появился специально для Chonchetrip. Он не гид и не контролёр: не проверяет геолокацию, не считает опоздания и всегда верит честному слову.</p>
              <p>Утром он оставляет шёпот, днём замечает находки, а после заката иногда сам попадается на глаза. Чем больше настоящих моментов сохранено, тем ярче становится его созвездие.</p>
            </section>

            <section className="paper-card kitsu-pact">
              <div className="card-label"><Icon name="sparkles" size={18} /> Договор путешествия</div>
              <h2>Главное правило — никакой гонки</h2>
              <ul>
                <li>Устала — отдых тоже считается приключением.</li>
                <li>Погода изменила план — значит, история выбрала другой путь.</li>
                <li>Ничего не нужно закрывать на 100%, чтобы поездка была идеальной.</li>
              </ul>
            </section>

            <section className="phrasebook">
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

      {modalAchievement && modal && <AchievementModal achievement={modalAchievement} isNew={modal.isNew} onClose={closeAchievementModal} />}
      {magicModal && <MagicDiscoveryModal magic={magicModal} onClose={() => setMagicModalDayId(null)} />}
      {confirmation && <ConfirmationDialog request={confirmation} onCancel={() => setConfirmation(null)} />}
      {kitsuReaction && <KitsuReactionToast key={kitsuReaction.id} message={kitsuReaction.message} />}
    </div>
  )
}

export default App
