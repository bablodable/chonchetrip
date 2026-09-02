import assert from 'node:assert/strict'
import {
  JAPAN_TIME_SWITCH_AT,
  chapterUnlockTime,
  getJourneyClock,
} from '../src/journeyClock.ts'
import { tripDays } from '../src/tripData.ts'

const beforeSerbiaMidnight = getJourneyClock(new Date('2026-09-29T21:59:59.999Z'))
assert.deepEqual(beforeSerbiaMidnight, {
  date: '2026-09-29',
  hour: 23,
  phase: 'serbia',
  timeZone: 'Europe/Belgrade',
})

const beforeSwitch = getJourneyClock(new Date(JAPAN_TIME_SWITCH_AT - 1))
assert.equal(beforeSwitch.date, '2026-09-29', 'The prologue must stay active until the planned DXB departure')
assert.equal(beforeSwitch.phase, 'serbia')
assert.equal(beforeSwitch.hour, 0)

const atSwitch = getJourneyClock(new Date(JAPAN_TIME_SWITCH_AT))
assert.deepEqual(atSwitch, {
  date: '2026-09-30',
  hour: 8,
  phase: 'japan',
  timeZone: 'Asia/Tokyo',
})

const atKixArrival = getJourneyClock(new Date('2026-09-30T08:15:00.000Z'))
assert.equal(atKixArrival.date, '2026-09-30')
assert.equal(atKixArrival.hour, 17)
assert.equal(atKixArrival.phase, 'japan')

assert.equal(new Date(chapterUnlockTime('2026-09-29')).toISOString(), '2026-09-28T22:00:00.000Z')
assert.equal(new Date(chapterUnlockTime('2026-09-30')).toISOString(), '2026-09-29T23:00:00.000Z')
assert.equal(new Date(chapterUnlockTime('2026-10-01')).toISOString(), '2026-09-30T15:00:00.000Z')

assert.ok(tripDays[0].timeGuide?.description.includes('01:00 Сербия'))
assert.ok(tripDays[0].timeGuide?.description.includes('08:00 Япония'))
assert.ok(tripDays[1].timeGuide?.description.includes('17:15 JST'))
assert.ok(tripDays.slice(2).every((day) => day.timeline.every((item) => !/Сербия|Dubai/.test(item.time))))

console.log('Journey clock audit passed: Serbia → Japan at 2026-09-29T23:00:00.000Z (01:00 Serbia / 03:00 Dubai / 08:00 Japan).')
