export const SERBIA_TIME_ZONE = 'Europe/Belgrade'
export const JAPAN_TIME_ZONE = 'Asia/Tokyo'

// Emirates DXB → KIX is scheduled for 03:00 Dubai time on 30 September 2026.
// That same instant is 01:00 in Serbia and 08:00 in Japan.
export const JAPAN_TIME_SWITCH_AT = Date.UTC(2026, 8, 29, 23, 0, 0)

export type JourneyClock = {
  date: string
  hour: number
  phase: 'serbia' | 'japan'
  timeZone: typeof SERBIA_TIME_ZONE | typeof JAPAN_TIME_ZONE
}

const dateInTimeZone = (timeZone: string, now: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

export const hourInTimeZone = (timeZone: string, now = new Date()) => Number(
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now).find((part) => part.type === 'hour')?.value ?? 0,
)

export const getJourneyClock = (now = new Date()): JourneyClock => {
  const japanPhase = now.getTime() >= JAPAN_TIME_SWITCH_AT
  const timeZone = japanPhase ? JAPAN_TIME_ZONE : SERBIA_TIME_ZONE
  const localDate = dateInTimeZone(timeZone, now)

  // Serbia reaches 30 September one hour before the planned time-zone switch.
  // Keep the prologue active during that short airport interval.
  const date = !japanPhase && localDate === '2026-09-30'
    ? '2026-09-29'
    : localDate

  return {
    date,
    hour: hourInTimeZone(timeZone, now),
    phase: japanPhase ? 'japan' : 'serbia',
    timeZone,
  }
}

export const chapterUnlockTime = (date: string) => {
  if (date === '2026-09-29') return Date.UTC(2026, 8, 28, 22, 0, 0)
  if (date === '2026-09-30') return JAPAN_TIME_SWITCH_AT

  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day, -9, 0, 0)
}
