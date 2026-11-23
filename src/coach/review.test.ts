import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { reviewPly, explain } from './review'

const mv = (fen: string, san: string) => new Chess(fen).move(san)
const START = new Chess().fen()

describe('reviewPly', () => {
  it('marks the engine move as best', () => {
    const r = reviewPly(START, mv(START, 'e4'), { score: { cp: 30 }, bestMove: { from: 'e2', to: 'e4' }, pv: ['e2e4'] }, { score: { cp: 30 }, pv: [] }, 1)
    expect(r.label).toBe('best')
    expect(r.accuracy).toBeGreaterThan(99)
  })

  it('tags a hanging piece', () => {
    const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3'
    const r = reviewPly(fen, mv(fen, 'Qh5'), { score: { cp: 30 }, bestMove: { from: 'g1', to: 'f3' }, pv: ['g1f3'] }, { score: { cp: -900 }, pv: ['f6h5'] }, 5)
    expect(r.label).toBe('blunder')
    expect(r.tags).toContain('hangs')
    expect(r.captured).toBe('queen on h5')
    expect(r.bestSan).toBe('Nf3')
    expect(explain(r)).toMatch(/Nxh5/)
  })

  it('tags allows mate', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/8/PPPPPP1P/RNBQKBNR w KQkq - 0 2'
    const r = reviewPly(fen, mv(fen, 'f3'), { score: { cp: -60 }, bestMove: { from: 'f1', to: 'g2' }, pv: [] }, { score: { mate: -1 }, pv: ['d8h4'] }, 3)
    expect(r.label).toBe('blunder')
    expect(r.tags).toContain('allowsMate')
    expect(explain(r)).toMatch(/mate in 1/i)
    expect(explain(r)).toMatch(/Qh4#/)
  })

  it('tags missed mate', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'
    const r = reviewPly(fen, mv(fen, 'h3'), { score: { mate: 1 }, bestMove: { from: 'a1', to: 'a8' }, pv: ['a1a8'] }, { score: { cp: 500 }, pv: [] }, 1)
    expect(r.tags).toContain('missedMate')
    expect(explain(r)).toMatch(/Ra8#/)
  })

  it('tags a missed capture that wins material', () => {
    const fen = '4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1'
    const r = reviewPly(fen, mv(fen, 'Kf2'), { score: { cp: 900 }, bestMove: { from: 'e4', to: 'd5' }, pv: ['e4d5'] }, { score: { cp: -50 }, pv: [] }, 1)
    expect(r.tags).toContain('missedWin')
    expect(explain(r)).toMatch(/exd5/)
  })

  it('black loss is measured from black side', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    const r = reviewPly(fen, mv(fen, 'f6'), { score: { cp: 30 }, bestMove: { from: 'e7', to: 'e5' }, pv: [] }, { score: { cp: 110 }, pv: [] }, 2)
    expect(r.loss).toBeGreaterThan(0.05)
    expect(['inaccuracy', 'mistake']).toContain(r.label)
  })
})
