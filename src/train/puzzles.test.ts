import { describe, it, expect } from 'vitest'
import { newRating, reschedule, nextStreak, difficultyFor, toDrill } from './puzzles'

const DAY = 864e5

describe('rating', () => {
  it('win against equal gains 16', () => expect(newRating(1200, 1200, true)).toBe(1216))
  it('loss against equal loses 16', () => expect(newRating(1200, 1200, false)).toBe(1184))
  it('win against much harder gains more', () => expect(newRating(1200, 1600, true)).toBeGreaterThan(1225))
  it('never below 400', () => expect(newRating(400, 2000, false)).toBe(400))
})

describe('spaced repetition', () => {
  it('a miss comes back tomorrow', () => expect(reschedule(undefined, false, 0)).toEqual({ box: 0, due: DAY }))
  it('solving moves up the boxes: 1, 3, 7 days', () => {
    expect(reschedule({ box: 0, due: 0 }, true, 0)).toEqual({ box: 1, due: 3 * DAY })
    expect(reschedule({ box: 1, due: 0 }, true, 0)).toEqual({ box: 2, due: 7 * DAY })
  })
  it('solved after the last box leaves the queue', () => expect(reschedule({ box: 2, due: 0 }, true, 0)).toBeNull())
  it('a fresh solve never enters the queue', () => expect(reschedule(undefined, true, 0)).toBeNull())
})

describe('streak', () => {
  it('starts at 1', () => expect(nextStreak({ last: null, count: 0 }, '2026-11-23')).toEqual({ last: '2026-11-23', count: 1 }))
  it('continues the next day', () => expect(nextStreak({ last: '2026-11-22', count: 4 }, '2026-11-23').count).toBe(5))
  it('same day does not double count', () => expect(nextStreak({ last: '2026-11-23', count: 4 }, '2026-11-23').count).toBe(4))
  it('resets after a gap', () => expect(nextStreak({ last: '2026-11-20', count: 9 }, '2026-11-23').count).toBe(1))
})

describe('lichess mapping', () => {
  it('maps rating to difficulty', () => {
    expect(difficultyFor(900)).toBe('easiest')
    expect(difficultyFor(1500)).toBe('normal')
    expect(difficultyFor(2300)).toBe('hardest')
  })
  it('converts an API puzzle to a drill', () => {
    const d = toDrill({ puzzle: { id: 'abc', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', solution: ['h1h8'], rating: 900, themes: ['mateIn1', 'endgame'] } })
    expect(d).toMatchObject({ id: 'lp-abc', goal: 'mate', solution: ['h1h8'], rating: 900, theme: 'mateIn1' })
  })
})
