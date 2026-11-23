import { describe, it, expect } from 'vitest'
import { mergeSnapshots, parseSnapshot, type Snapshot } from './sync'

const game = (id: string) => ({ id, date: 1, accuracy: 70, skills: {}, counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, phases: { opening: null, middlegame: null, endgame: null }, result: 'win', level: 3, color: 'w', reason: '', plies: 1, pgn: '' })
const a: Snapshot = {
  v: 1, games: [game('1'), game('2')] as never,
  academy: { done: ['s1-rook'], xp: 10, placement: 2 },
  puzzles: { rating: 1100, theme: 'fork', solved: 5, tried: 8, streak: { last: '2026-11-22', count: 3 }, queue: [{ drill: { id: 'p1' }, card: { box: 0, due: 5 } }] as never },
  fixed: ['F1'],
}
const b: Snapshot = {
  v: 1, games: [game('2'), game('3')] as never,
  academy: { done: ['s1-rook', 's2-castle'], xp: 25, placement: null },
  puzzles: { rating: 1050, theme: 'mix', solved: 9, tried: 12, streak: { last: '2026-11-23', count: 1 }, queue: [{ drill: { id: 'p2' }, card: { box: 1, due: 9 } }] as never },
  fixed: ['F2'],
}

describe('mergeSnapshots', () => {
  const m = mergeSnapshots(a, b)
  it('unions games by id', () => expect(m.games.map(g => g.id).sort()).toEqual(['1', '2', '3']))
  it('unions lessons, keeps max xp and best placement', () => expect(m.academy).toEqual({ done: ['s1-rook', 's2-castle'], xp: 25, placement: 2 }))
  it('puzzles: the device with more attempts wins the rating; queues union', () => {
    expect(m.puzzles.rating).toBe(1050)
    expect(m.puzzles.tried).toBe(12)
    expect(m.puzzles.queue.map(q => (q.drill as { id: string }).id).sort()).toEqual(['p1', 'p2'])
  })
  it('streak: the latest day wins', () => expect(m.puzzles.streak).toEqual({ last: '2026-11-23', count: 1 }))
  it('unions fixed positions', () => expect(m.fixed.sort()).toEqual(['F1', 'F2']))
  it('is symmetric for games and lessons', () => {
    const n = mergeSnapshots(b, a)
    expect(n.games.length).toBe(3)
    expect(n.academy).toEqual(m.academy)
  })
})

describe('parseSnapshot', () => {
  it('accepts a valid snapshot', () => expect(parseSnapshot(a)).not.toBeNull())
  it('drops bad games but keeps the rest', () => expect(parseSnapshot({ ...a, games: [game('1'), { id: 5 }] })!.games).toHaveLength(1))
  it('rejects garbage', () => expect(parseSnapshot({ v: 2 })).toBeNull())
})
