export type CloudflareEnv = {
  DB: D1Database
  EDITOR_CODE?: string
  SESSION_SECRET?: string
}

export type StoredProgress = {
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
  dailySteps: Record<string, number>
  fujiDate: '2026-10-09' | '2026-10-11'
  foxFires: string[]
  kitsuEncounters: string[]
  openedLetters: string[]
  finaleOpened: boolean
  fromsoftRelic: 'dark-souls' | 'elden-ring' | null
  fromsoftEmberUsedAt: string | null
  tripCounters: {
    ramen: number
    onigiri: number
    gachapon: number
    goshuin: number
    vending: number
    sweets: number
  }
}
