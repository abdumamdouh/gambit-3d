import { describe, it, expect } from 'vitest'
import { ownPositions, judge, toDrill, type Explorer } from './repertoire'

const rec = (pgn: string, color: 'w' | 'b' = 'w') => ({ pgn, color })

describe('ownPositions', () => {
  it('collects only my moves in the opening, most frequent first', () => {
    const ps = ownPositions([rec('1. e4 e5 2. Qh5 Nc6'), rec('1. e4 e5 2. Qh5 Nf6'), rec('1. d4 d5')], 4)
    expect(ps.map(p => p.san)).toEqual(['e4', 'Qh5', 'd4'])
    expect(ps[0].count).toBe(2)
  })
  it('works for Black', () => {
    const ps = ownPositions([rec('1. e4 c5 2. Nf3 d6', 'b')], 4)
    expect(ps.map(p => p.san)).toEqual(['c5', 'd6'])
  })
})

const ex = (moves: [string, string, number][]): Explorer => ({ moves: moves.map(([uci, san, n]) => ({ uci, san, white: n, draws: 0, black: 0 })) })

describe('judge', () => {
  const pos = { fen: 'F', uci: 'd1h5', san: 'Qh5', count: 2, ply: 3 }
  it('flags a rare move and lists the main moves', () => {
    const j = judge(pos, ex([['g1f3', 'Nf3', 900], ['f1c4', 'Bc4', 300], ['d1h5', 'Qh5', 10]]))!
    expect(j.deviation).toBe(true)
    expect(j.share).toBeCloseTo(10 / 1210)
    expect(j.top.map(t => t.san)).toEqual(['Nf3', 'Bc4'])
  })
  it('a main move is fine', () => expect(judge(pos, ex([['d1h5', 'Qh5', 500], ['g1f3', 'Nf3', 500]]))!.deviation).toBe(false))
  it('a move masters never played is a deviation', () => expect(judge(pos, ex([['g1f3', 'Nf3', 900]]))!.share).toBe(0))
  it('too little data → no verdict', () => expect(judge(pos, ex([['g1f3', 'Nf3', 20]]))).toBeNull())
})

describe('toDrill', () => {
  it('accepts every main move', () => {
    const j = judge({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', uci: 'd1h5', san: 'Qh5', count: 1, ply: 3 }, ex([['g1f3', 'Nf3', 900], ['f1c4', 'Bc4', 300], ['d1h5', 'Qh5', 1]]))!
    expect(toDrill(j).solution).toEqual(['g1f3|f1c4'])
  })
})
