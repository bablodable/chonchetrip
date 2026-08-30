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
    stamps: strings(source.stamps),
    sideQuests: strings(source.sideQuests),
    konbini: strings(source.konbini),
    ramen: source.ramen === true,
    ratings: ratings(source.ratings),
    fujiDate: source.fujiDate === '2026-10-11' ? '2026-10-11' : '2026-10-09',
    foxFires: strings(source.foxFires),
    kitsuEncounters: strings(source.kitsuEncounters),
    openedLetters: strings(source.openedLetters),
    finaleOpened: source.finaleOpened === true,
  }
}
