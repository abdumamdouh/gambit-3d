import { describe, it, expect } from 'vitest'
import { analyzeStyle } from './style'
import type { GameRecord, Mistake } from '../progress/skills'

let n = 0
const mk = (tags: Mistake['tags'], label: Mistake['label'] = 'blunder', phase: Mistake['phase'] = 'middlegame'): Mistake =>
  ({ fen: `fen${n++}`, san: 'Qh5', best: 'g1f3', bestSan: 'Nf3', label, tags, phase, loss: label === 'blunder' ? 0.3 : 0.12, ply: 9 })
const game = (o: Partial<GameRecord> = {}): GameRecord => ({
  id: String(n++), date: n, color: 'w', level: 3, result: 'loss', reason: 'checkmate', accuracy: 70, plies: 30,
  counts: { best: 5, good: 10, inaccuracy: 1, mistake: 1, blunder: 1 }, phases: { opening: 85, middlegame: 65, endgame: null },
  skills: { pieceSafety: 75, development: 70, tactics: 50, endgame: null, calculation: 72 }, pgn: '',
  mistakes: [mk(['hangs'])], opening: 'e4 e5 Nf3 Nc6', castlePly: 9, earlyQueen: false, ...o,
})

describe('analyzeStyle', () => {
  it('needs games', () => expect(analyzeStyle([]).weaknesses).toEqual([]))

  it('finds hanging pieces as the top weakness, with examples', () => {
    const p = analyzeStyle([game(), game(), game({ mistakes: [mk(['hangs']), mk(['hangs'])] })])
    expect(p.weaknesses[0].id).toBe('hangs')
    expect(p.weaknesses[0].perGame).toBeCloseTo(4 / 3)
    expect(p.weaknesses[0].examples.length).toBeGreaterThan(0)
    expect(p.weaknesses[0].theme).toBe('hangingPiece')
  })

  it('flags late castling and early queen moves', () => {
    const p = analyzeStyle([game({ castlePly: null, earlyQueen: true }), game({ castlePly: 31, earlyQueen: true }), game({ castlePly: null })])
    const ids = p.weaknesses.map(w => w.id)
    expect(ids).toContain('lateCastle')
    expect(ids).toContain('earlyQueen')
  })

  it('flags weak endgames from phase accuracy', () => {
    const p = analyzeStyle([game({ phases: { opening: 85, middlegame: 70, endgame: 40 }, mistakes: [] }), game({ phases: { opening: 85, middlegame: 70, endgame: 45 }, mistakes: [] })])
    expect(p.weaknesses.map(w => w.id)).toContain('endgame')
  })

  it('reports a trend when recent games improve', () => {
    const old = [...Array(5)].map(() => game({ mistakes: [mk(['hangs']), mk(['hangs'])] }))
    const recent = [...Array(5)].map(() => game({ mistakes: [] }))
    const w = analyzeStyle([...old, ...recent]).weaknesses.find(x => x.id === 'hangs')
    expect(w?.trend).toBe('better')
  })

  it('lists strengths for clean areas', () => {
    const p = analyzeStyle([game({ mistakes: [] }), game({ mistakes: [] })])
    expect(p.strengths.join(' ')).toMatch(/hang/i)
  })

  it('groups openings with score and accuracy', () => {
    const p = analyzeStyle([game({ result: 'win' }), game({ result: 'draw' }), game({ opening: 'd4 d5 c4 e6' })])
    expect(p.openings[0]).toMatchObject({ line: 'e4 e5 Nf3 Nc6', games: 2, score: 0.75 })
  })
})
