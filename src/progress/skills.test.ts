import { describe, it, expect } from 'vitest'
import { buildRecord, verdict, ratingEstimate, type GameRecord } from './skills'
import type { PlyReview } from '../coach/review'

const ply = (o: Partial<PlyReview>): PlyReview & { phase: 'opening' | 'middlegame' | 'endgame' } => ({
  ply: 1, san: 'e4', color: 'w', from: 'e2', to: 'e4', before: { cp: 0 }, after: { cp: 0 }, best: null, bestSan: null, pvSan: [],
  loss: 0, label: 'good', accuracy: 90, tags: [], phase: 'opening', ...o,
})

describe('buildRecord', () => {
  const plies = [
    ply({ ply: 1, san: 'e4', accuracy: 100, label: 'best' }),
    ply({ ply: 2, color: 'b', san: 'e5' }),
    ply({ ply: 3, san: 'Nf3', from: 'g1', accuracy: 80 }),
    ply({ ply: 5, san: 'Bc4', from: 'f1', accuracy: 40, label: 'blunder', tags: ['hangs'], phase: 'middlegame' }),
    ply({ ply: 7, san: 'O-O', from: 'e1', accuracy: 60, label: 'mistake', tags: ['missedWin'], phase: 'endgame' }),
    ply({ ply: 9, san: 'Rxe5+', from: 'f1', accuracy: 100, label: 'best', phase: 'endgame' }),
  ]
  const r = buildRecord(plies, { color: 'w', level: 3, result: 'win', reason: 'checkmate', date: 1000, pgn: '' })

  it('only counts the player moves', () => expect(r.plies).toBe(5))
  it('accuracy is the mean of player moves', () => expect(r.accuracy).toBeCloseTo((100 + 80 + 40 + 60 + 100) / 5))
  it('counts labels', () => expect(r.counts).toMatchObject({ best: 2, good: 1, blunder: 1, mistake: 1 }))
  it('phase averages', () => {
    expect(r.phases.opening).toBeCloseTo(90)
    expect(r.phases.endgame).toBeCloseTo(80)
  })
  it('piece safety drops per hang', () => expect(r.skills.pieceSafety).toBe(75))
  it('calculation drops per blunder and mistake', () => expect(r.skills.calculation).toBe(100 - 20 - 8))
  it('development counts castling and minors', () => expect(r.skills.development).toBe(40 + 15 + 15))
  it('tactics = found / chances', () => expect(r.skills.tactics).toBe(50))
  it('endgame = endgame accuracy', () => expect(r.skills.endgame).toBeCloseTo(80))
})

const rec = (daysAgo: number, accuracy: number, level = 3, result: GameRecord['result'] = 'win'): GameRecord =>
  ({ id: String(daysAgo) + accuracy, date: NOW - daysAgo * 864e5, color: 'w', level, result, reason: 'checkmate', accuracy, plies: 20, counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, phases: { opening: null, middlegame: null, endgame: null }, skills: { pieceSafety: 100, development: 100, tactics: null, endgame: null, calculation: 100 }, pgn: '' })
const NOW = 100 * 864e5

describe('verdict', () => {
  it('not enough games', () => expect(verdict([rec(1, 70)], NOW)).toBe('not-enough'))
  it('improving', () => expect(verdict([rec(1, 75), rec(2, 75), rec(9, 60), rec(10, 62)], NOW)).toBe('improving'))
  it('dropping', () => expect(verdict([rec(1, 55), rec(2, 55), rec(9, 70), rec(10, 70)], NOW)).toBe('dropping'))
  it('flat', () => expect(verdict([rec(1, 70), rec(2, 70), rec(9, 69), rec(10, 70)], NOW)).toBe('flat'))
})

describe('ratingEstimate', () => {
  it('null with no games', () => expect(ratingEstimate([])).toBeNull())
  it('win at level 3 is above 1000', () => expect(ratingEstimate([rec(1, 70, 3, 'win')])).toBe(1400))
  it('draw at level 4 = 1320', () => expect(ratingEstimate([rec(1, 70, 4, 'draw')])).toBe(1320))
  it('uses last 10 games', () => {
    const many = [...Array(10)].map((_, i) => rec(i, 70, 1, 'loss')).concat([rec(50, 70, 8, 'win')])
    expect(ratingEstimate(many)).toBe(0)
  })
})
