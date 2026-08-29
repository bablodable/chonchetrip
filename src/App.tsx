import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  achievements,
  passportStamps,
  sideQuests,
  tripDays,
  type Achievement,
  type TimelineItem,
  type TripDay,
} from './tripData'

type ViewName = 'journey' | 'collection' | 'passport' | 'kitsu'

type Progress = {
  claimed: string[]
  checkedStops: Record<string, string[]>
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
}

const PREVIEW_DATE = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null
const PREVIEW_MODE = Boolean(PREVIEW_DATE)
const STORAGE_KEY = PREVIEW_MODE
  ? 'chonchetrip-preview-progress-v1'
  : 'chonchetrip-live-progress-v1'

const emptyProgress: Progress = {
  claimed: [],
  checkedStops: {},
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
}

function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return emptyProgress
    const parsed = JSON.parse(stored) as Partial<Progress>
    return {
      ...emptyProgress,
      ...parsed,
      checkedStops: parsed.checkedStops ?? {},
      solvedRiddles: parsed.solvedRiddles ?? [],
      sideQuests: parsed.sideQuests ?? [],
      ratings: parsed.ratings ?? {},
      photos: parsed.photos ?? {},
    }
  } catch {
    return emptyProgress
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
  if (achievement.image) return <img className={locked ? 'badge-image is-locked' : 'badge-image'} src={achievement.image} alt="" loading="lazy" decoding="async" />
  return <div className={locked ? 'seal-badge is-locked' : 'seal-badge'} aria-hidden="true"><span>{locked ? '?' : achievement.seal ?? '?'}</span></div>
}

function AchievementModal({ achievement, isNew, onClose }: { achievement: Achievement; isNew: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeRef.current?.focus() }, [])

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

function TimelineCard({ item, complete, onToggle }: { item: TimelineItem; complete: boolean; onToggle: () => void }) {
  return (
    <details className={complete ? 'timeline-card is-complete' : 'timeline-card'}>
      <summary>
        <button className="stop-check" type="button" aria-label={complete ? 'Отметить как невыполненное' : 'Отметить как выполненное'} onClick={(event) => { event.preventDefault(); onToggle() }}>{complete && <Icon name="check" size={17} />}</button>
        <span className={`kind-icon kind-${item.kind}`}><Icon name={item.kind} size={18} /></span>
        <span className="timeline-title"><small>{item.time}</small><strong>{item.title}</strong></span>
        <span className="details-chevron"><Icon name="chevron" size={18} /></span>
      </summary>
      <div className="timeline-details">{item.details.map((detail) => <p key={detail}>{detail}</p>)}</div>
    </details>
  )
}

function App() {
  const today = useJapanToday()
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [view, setView] = useState<ViewName>('journey')
  const latestUnlocked = [...tripDays].reverse().find((day) => day.date <= today)
  const [selectedDate, setSelectedDate] = useState(latestUnlocked?.date ?? tripDays[0].date)
  const [riddleAnswers, setRiddleAnswers] = useState<Record<string, number>>({})
  const [modal, setModal] = useState<{ id: string; isNew: boolean } | null>(null)
  const [photoError, setPhotoError] = useState('')

  const selectedDay = dayContentForDate(selectedDate, progress.fujiDate)
  const selectedUnlocked = selectedDate <= today
  const selectedAchievement = achievements.find((item) => item.id === selectedDay.achievementId)
  const modalAchievement = modal ? achievements.find((item) => item.id === modal.id) : undefined
  const selectedStops = progress.checkedStops[selectedDay.id] ?? []
  const selectedClaimed = progress.claimed.includes(selectedDay.achievementId)
  const solvedRiddles = progress.solvedRiddles ?? []
  const selectedAnswer = riddleAnswers[selectedDay.id]
    ?? (solvedRiddles.includes(selectedDay.id) ? selectedDay.riddle.answer : undefined)
  const isCorrect = selectedAnswer === selectedDay.riddle.answer
  const rating = progress.ratings[selectedDay.id]
  const discoveredCount = progress.claimed.length
  const completedSideQuests = progress.sideQuests ?? []
  const previewMode = PREVIEW_MODE

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // The photo handler surfaces storage errors where the user can act on them.
    }
  }, [progress])

  useEffect(() => {
    const claimed = new Set(progress.claimed)
    const unlock = (condition: boolean, id: string) => { if (condition && !claimed.has(id)) claimed.add(id) }
    unlock(progress.ramen, 'ramen-initiation')
    unlock(progress.konbini.length >= 3, 'konbini-connoisseur')
    unlock(progress.stamps.length >= 5, 'stamp-hunter')
    unlock(Object.values(progress.ratings).some((value) => value === 10), 'perfect-day')
    unlock(Object.keys(progress.photos).length >= 5, 'memory-keeper')
    unlock(['another-world', 'kyoto-after-dark', 'hello-tokyo'].every((id) => claimed.has(id)), 'night-owl')
    unlock(['welcome-to-japan', 'the-old-capital', 'hello-tokyo'].every((id) => claimed.has(id)), 'three-cities')
    unlock(claimed.has('hello-tokyo') && progress.reveals.length === 0, 'no-spoilers')
    unlock(progress.hints.length >= 5 && progress.reveals.length === 0, 'curious-fox')
    unlock((progress.solvedRiddles ?? []).length >= 1, 'field-researcher')
    unlock((progress.solvedRiddles ?? []).length >= 5, 'keen-eye')
    unlock(tripDays.filter((day) => day.riddle.location).every((day) => (progress.solvedRiddles ?? []).includes(day.id)), 'kitsus-equal')
    unlock((progress.sideQuests ?? []).length >= 1, 'side-quest-accepted')
    unlock((progress.sideQuests ?? []).includes('manhole-hunter'), 'manhole-hunter')
    unlock((progress.sideQuests ?? []).includes('gachapon-oracle'), 'capsule-of-fate')
    unlock((progress.sideQuests ?? []).includes('paper-fortune'), 'fortune-found')
    unlock(sideQuests.every((quest) => (progress.sideQuests ?? []).includes(quest.id)), 'wandering-legend')
    unlock(claimed.size >= 15, 'japan-collector')
    unlock(achievements.filter((item) => item.id !== 'completionist').every((item) => claimed.has(item.id)), 'completionist')
    const next = [...claimed]
    const newlyUnlocked = next.filter((id) => !progress.claimed.includes(id))
    if (newlyUnlocked.length > 0) {
      const timer = window.setTimeout(() => {
        setProgress((current) => ({ ...current, claimed: next }))
        setModal((current) => current ?? { id: newlyUnlocked[0], isNew: true })
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [progress])

  const claimAchievement = (id: string) => {
    if (progress.claimed.includes(id)) return
    setProgress((current) => ({ ...current, claimed: [...current.claimed, id] }))
    setModal({ id, isNew: true })
  }

  const toggleStop = (dayId: string, stopId: string) => {
    setProgress((current) => {
      const stops = current.checkedStops[dayId] ?? []
      const nextStops = stops.includes(stopId) ? stops.filter((id) => id !== stopId) : [...stops, stopId]
      return { ...current, checkedStops: { ...current.checkedStops, [dayId]: nextStops } }
    })
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
    if (answer !== day.riddle.answer || progress.reveals.includes(day.id) || !day.riddle.location) return
    setProgress((current) => {
      const solved = current.solvedRiddles ?? []
      return solved.includes(day.id) ? current : { ...current, solvedRiddles: [...solved, day.id] }
    })
  }

  const handlePhoto = async (file: File | undefined, dayId: string) => {
    if (!file) return
    setPhotoError('')
    try {
      const photo = await compressPhoto(file)
      setProgress((current) => ({ ...current, photos: { ...current.photos, [dayId]: photo } }))
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Не удалось сохранить фото')
    }
  }

  const toggleListValue = (field: 'stamps' | 'sideQuests' | 'konbini', id: string) => {
    setProgress((current) => {
      const values = current[field] ?? []
      const next = values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
      return { ...current, [field]: next }
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => { setView('journey'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <img src="/assets/chonchetrip-icon.png" alt="" />
          <span><strong>Chonchetrip</strong><small>Japan · 2026</small></span>
        </button>
        <button className="progress-token" type="button" onClick={() => setView('collection')} aria-label={`${discoveredCount} из ${achievements.length} достижений`}><Icon name="collection" size={17} /><span>{discoveredCount}/{achievements.length}</span></button>
      </header>

      <main>
        {view === 'journey' && (
          <>
            <section className={selectedUnlocked ? 'chapter-hero' : 'chapter-hero is-locked'} style={{ backgroundImage: `url(${selectedUnlocked ? selectedDay.cover : '/assets/chonchetrip-splash.png'})` }}>
              <div className="hero-shade" />
              <div className="hero-content">
                {previewMode && <span className="preview-pill">Preview · Japan {today}</span>}
                {!selectedUnlocked && <span className="hero-lock"><Icon name="lock" size={18} /> До открытия главы</span>}
                <p>{selectedUnlocked ? selectedDay.eyebrow : 'История ещё спит'}</p>
                <h1>{selectedUnlocked ? selectedDay.title : `${daysUntil(selectedDate)} дн.`}</h1>
                <span>{selectedUnlocked ? selectedDay.subtitle : `Глава откроется ${selectedDay.dateLabel} по времени Японии`}</span>
              </div>
            </section>

            <section className="day-rail-section" aria-label="Дни путешествия">
              <div className="day-rail">
                {tripDays.map((slot, index) => {
                  const content = dayContentForDate(slot.date, progress.fujiDate)
                  const unlocked = slot.date <= today
                  const active = slot.date === selectedDate
                  const claimed = progress.claimed.includes(content.achievementId)
                  return (
                    <button key={slot.date} type="button" className={`day-chip${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}${claimed ? ' is-claimed' : ''}`} onClick={() => setSelectedDate(slot.date)}>
                      <small>{index + 1}</small>
                      <strong>{slot.dateLabel.replace(' октября', '').replace(' сентября', ' сен')}</strong>
                      {unlocked ? <span>{claimed ? <Icon name="check" size={12} /> : content.city}</span> : <Icon name="lock" size={12} />}
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedUnlocked ? (
              <div className="screen-content day-content">
                <section className="chapter-heading">
                  <div><span className="section-kicker">{selectedDay.dateLabel} · {selectedDay.city}</span><h2>Приключение дня</h2></div>
                  <div className="day-progress"><strong>{selectedStops.length}/{selectedDay.timeline.length}</strong><small>сцен</small></div>
                </section>

                <section className="timeline-list">
                  {selectedDay.timeline.map((item) => <TimelineCard key={item.id} item={item} complete={selectedStops.includes(item.id)} onToggle={() => toggleStop(selectedDay.id, item.id)} />)}
                </section>

                <section className="paper-card fact-card">
                  <div className="card-label"><Icon name="fox" size={18} /> Шёпот Кицу</div>
                  <img src="/assets/kitsune-guide.png" alt="" />
                  <p>{selectedDay.fact}</p>
                </section>

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
                      return <button key={option} type="button" className={`answer-button${answerClass}`} onClick={() => answerRiddle(selectedDay, index)}>{option}</button>
                    })}
                  </div>
                  {isCorrect && <p className="answer-note"><Icon name="check" size={16} /> {selectedDay.riddle.explanation}</p>}
                  {selectedAnswer !== undefined && !isCorrect && <p className="try-again">Почти. Кицу разрешает попробовать ещё раз.</p>}
                  {progress.hints.includes(selectedDay.id) && <p className="hint-text">Подсказка: {selectedDay.riddle.hint}</p>}
                  <div className="riddle-actions">
                    <button type="button" className="text-button" onClick={() => addHint(selectedDay.id)}><Icon name="hint" size={17} /> Подсказка</button>
                    <button type="button" className="text-button muted" onClick={() => revealAnswer(selectedDay)}><Icon name="eye" size={17} /> Reveal answer</button>
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
                    <button type="button" className={selectedClaimed ? 'claimed-button' : 'primary-button'} disabled={selectedClaimed} onClick={() => claimAchievement(selectedAchievement.id)}>
                      {selectedClaimed ? <><Icon name="check" size={18} /> Получено</> : selectedDay.claimLabel}
                    </button>
                  </section>
                )}

                <section className="paper-card memory-card">
                  <div className="memory-heading"><div><span className="section-kicker">Day recap</span><h3>Сохранить этот день</h3></div><Icon name="camera" size={25} /></div>
                  {progress.photos[selectedDay.id] ? (
                    <div className="photo-preview">
                      <img src={progress.photos[selectedDay.id]} alt={`Фото дня · ${selectedDay.dateLabel}`} />
                      <label className="photo-change">Заменить<input type="file" accept="image/*" onChange={(event) => void handlePhoto(event.target.files?.[0], selectedDay.id)} /></label>
                    </div>
                  ) : (
                    <label className="photo-drop"><Icon name="camera" size={22} /><span>Добавить Photo of the Day</span><small>Фото уменьшится и останется только на этом телефоне</small><input type="file" accept="image/*" onChange={(event) => void handlePhoto(event.target.files?.[0], selectedDay.id)} /></label>
                  )}
                  {photoError && <p className="error-message">{photoError}</p>}
                  <div className="rating-row"><label htmlFor="day-rating">Как прошёл день?</label><strong>{rating ? `${rating}/10` : '—'}</strong></div>
                  <input id="day-rating" className="rating-slider" type="range" min="1" max="10" value={rating ?? 5} onChange={(event) => setProgress((current) => ({ ...current, ratings: { ...current.ratings, [selectedDay.id]: Number(event.target.value) } }))} />
                  <div className="rating-scale"><span>тихо</span><span>легендарно</span></div>
                </section>
              </div>
            ) : (
              <div className="screen-content locked-content">
                <img src="/assets/kitsune-guide.png" alt="Кицу — проводник путешествия" />
                <span className="section-kicker">Время Tokyo · UTC+9</span>
                <h2>Кицу хранит секрет</h2>
                <p>Каждая глава открывается в полночь по японскому времени. До этого маршрут и награда остаются под печатью.</p>
                <div className="locked-note"><Icon name="sparkles" size={18} /><span>Можно заранее смотреть коллекцию, но будущие бейджи не спойлерят приключение.</span></div>
              </div>
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
                  <button key={achievement.id} type="button" className={unlocked ? 'badge-tile is-unlocked' : 'badge-tile'} disabled={!unlocked} onClick={() => setModal({ id: achievement.id, isNew: false })}>
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
              <img src="/assets/kitsune-guide.png" alt="" />
            </section>

            <section className="paper-card fuji-switcher">
              <div className="card-label"><Icon name="place" size={18} /> План Fuji</div>
              <h3>Когда охотимся за горой?</h3>
              <p>Если облачно, контент Fuji и награда переедут вместе.</p>
              <div className="segmented-control">
                <button type="button" className={progress.fujiDate === '2026-10-09' ? 'is-active' : ''} onClick={() => setProgress((current) => ({ ...current, fujiDate: '2026-10-09' }))}>9 окт</button>
                <button type="button" className={progress.fujiDate === '2026-10-11' ? 'is-active' : ''} onClick={() => setProgress((current) => ({ ...current, fujiDate: '2026-10-11' }))}>11 окт</button>
              </div>
            </section>

            <section className="passport-section">
              <div className="section-title"><div><span className="section-kicker">Eki stamp</span><h2>Пять печатей</h2></div><strong>{progress.stamps.length}/5</strong></div>
              <div className="stamp-list">
                {passportStamps.map((stamp, index) => {
                  const found = progress.stamps.includes(stamp.id)
                  return (
                    <button key={stamp.id} type="button" className={found ? 'stamp-card is-found' : 'stamp-card'} onClick={() => toggleListValue('stamps', stamp.id)}>
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
              <button type="button" className={progress.ramen ? 'quest-toggle is-complete' : 'quest-toggle'} onClick={() => setProgress((current) => ({ ...current, ramen: !current.ramen }))}>
                <span className="quest-toggle-icon"><Icon name="bowl" size={23} /></span><span><strong>Первый ramen</strong><small>Отметить после первой миски</small></span><span className="mini-check">{progress.ramen && <Icon name="check" size={16} />}</span>
              </button>
              <p className="mini-label">Три разных konbini</p>
              <div className="konbini-grid">
                {['7-Eleven', 'FamilyMart', 'Lawson'].map((shop) => <button key={shop} type="button" className={progress.konbini.includes(shop) ? 'is-active' : ''} onClick={() => toggleListValue('konbini', shop)}>{progress.konbini.includes(shop) && <Icon name="check" size={14} />}{shop}</button>)}
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
                    <button key={quest.id} type="button" className={complete ? 'quest-toggle is-complete' : 'quest-toggle'} onClick={() => toggleListValue('sideQuests', quest.id)}>
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
            <section className="kitsu-hero">
              <div><span className="section-kicker">Твой проводник</span><h1>Кицу</h1><p>Маленький лисий дух, который прячет секреты до нужного дня и замечает чудеса по дороге.</p></div>
              <img src="/assets/kitsune-guide.png" alt="Кицу — лисий проводник путешествия" />
            </section>

            <section className="paper-card kitsu-story">
              <div className="card-label"><Icon name="fox" size={18} /> Кто такой Кицу</div>
              <h2>Хранитель этой истории</h2>
              <p>Кицу появился специально для Chonchetrip. Он не гид и не контролёр: не проверяет геолокацию, не считает опоздания и всегда верит честному слову.</p>
              <p>Его работа — открывать новую главу в полночь по Японии, подбрасывать маленькие загадки и беречь найденные воспоминания.</p>
            </section>

            <section className="kitsu-guide">
              <div className="section-title"><div><span className="section-kicker">Как играть</span><h2>Четыре лёгких шага</h2></div></div>
              {[
                ['01', 'Открой день', 'Новая глава просыпается в 00:00 по времени Японии.'],
                ['02', 'Живи маршрут', 'Сцены можно отмечать, пропускать и менять местами без штрафов.'],
                ['03', 'Заметь улику', 'Полевые загадки предлагают внимательнее посмотреть вокруг.'],
                ['04', 'Забери память', 'После настоящего момента можно честно забрать его бейдж.'],
              ].map(([number, title, copy]) => (
                <article key={number} className="kitsu-step"><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></article>
              ))}
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
              <div className="section-title"><div><span className="section-kicker">На всякий случай</span><h2>Шесть фраз</h2></div></div>
              <div className="phrase-grid">
                {[
                  ['すみません', 'Sumimasen', 'Извините / можно вас?'],
                  ['ありがとうございます', 'Arigatō gozaimasu', 'Большое спасибо'],
                  ['お願いします', 'Onegaishimasu', 'Пожалуйста'],
                  ['大丈夫です', 'Daijōbu desu', 'Всё хорошо / не нужно'],
                  ['これをください', 'Kore o kudasai', 'Вот это, пожалуйста'],
                  ['駅はどこですか？', 'Eki wa doko desu ka?', 'Где находится станция?'],
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

      {modalAchievement && modal && <AchievementModal achievement={modalAchievement} isNew={modal.isNew} onClose={() => setModal(null)} />}
    </div>
  )
}

export default App
