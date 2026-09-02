import type { StoredProgress } from './types'

const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').slice(0, 200)
  : []

const stringLists = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, strings(item)]))
}

const ratings = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const rating = Number(item)
    return Number.isFinite(rating) && rating >= 1 && rating <= 10 ? [[key, rating]] : []
  }))
}

const riddleAnswers = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 100).flatMap(([key, item]) => {
    const answer = Number(item)
    return Number.isInteger(answer) && answer >= 0 && answer <= 20 ? [[key, answer]] : []
  }))
}

const dailySteps = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const steps = Number(item)
    return Number.isFinite(steps) && steps > 0
      ? [[key, Math.min(100_000, Math.round(steps))]]
      : []
  }))
}

const counterValue = (value: unknown) => {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? Math.min(9_999, Math.floor(count)) : 0
}

const tripCounters = (value: unknown) => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return {
    ramen: counterValue(source.ramen),
    onigiri: counterValue(source.onigiri),
    gachapon: counterValue(source.gachapon),
    goshuin: counterValue(source.goshuin),
    vending: counterValue(source.vending),
    figures: counterValue(source.figures ?? source.sweets),
    train: counterValue(source.train),
  }
}

const fromsoftRelic = (value: unknown) => value === 'dark-souls' || value === 'elden-ring' ? value : null

const fromsoftEmberUsedAt = (value: unknown) => typeof value === 'string'
  && value.length <= 160
  && value.endsWith(':riddle')
  ? value
  : null

export const sanitizeProgress = (value: unknown): StoredProgress | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  return {
    claimed: strings(source.claimed),
    checkedStops: stringLists(source.checkedStops),
    unlockedStops: stringLists(source.unlockedStops),
    unlockedDays: strings(source.unlockedDays),
    hints: strings(source.hints),
    reveals: strings(source.reveals),
    solvedRiddles: strings(source.solvedRiddles),
    riddleAnswers: riddleAnswers(source.riddleAnswers),
    stamps: strings(source.stamps),
    sideQuests: strings(source.sideQuests),
    konbini: strings(source.konbini),
    ramen: source.ramen === true,
    ratings: ratings(source.ratings),
    dailySteps: dailySteps(source.dailySteps),
    foxFires: strings(source.foxFires),
    kitsuEncounters: strings(source.kitsuEncounters),
    openedLetters: strings(source.openedLetters),
    finaleOpened: source.finaleOpened === true,
    fromsoftRelic: fromsoftRelic(source.fromsoftRelic),
    fromsoftEmberUsedAt: fromsoftEmberUsedAt(source.fromsoftEmberUsedAt),
    tripCounters: tripCounters(source.tripCounters),
  }
}
