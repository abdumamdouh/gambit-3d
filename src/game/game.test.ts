import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { initialPieces, applyMove, type Piece } from './pieces'
import { gameResult } from './result'

const play = (sans: string[]) => {
  const c = new Chess()
  let p = initialPieces()
  for (const s of sans) p = applyMove(p, c.move(s))
  return { c, p }
}
const at = (p: Piece[], sq: string) => p.find(x => !x.captured && x.square === sq)

describe('pieces', () => {
  it('starts with 32 pieces with unique ids', () => {
    const p = initialPieces()
    expect(p).toHaveLength(32)
    expect(new Set(p.map(x => x.id)).size).toBe(32)
  })
  it('keeps id on a normal move', () => {
    const { p } = play(['e4'])
    expect(at(p, 'e4')!.id).toBe(at(initialPieces(), 'e2')!.id)
  })
  it('marks capture', () => {
    const { p } = play(['e4', 'd5', 'exd5'])
    expect(p.filter(x => x.captured)).toHaveLength(1)
    expect(at(p, 'd5')!.color).toBe('w')
  })
  it('moves the rook when castling short', () => {
    const { p } = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'])
    expect(at(p, 'g1')!.type).toBe('k')
    expect(at(p, 'f1')!.type).toBe('r')
    expect(at(p, 'h1')).toBeUndefined()
  })
  it('moves the rook when castling long', () => {
    const { p } = play(['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7', 'O-O-O'])
    expect(at(p, 'c1')!.type).toBe('k')
    expect(at(p, 'd1')!.type).toBe('r')
  })
  it('removes the pawn on en passant', () => {
    const { p } = play(['e4', 'a6', 'e5', 'd5', 'exd6'])
    expect(at(p, 'd5')).toBeUndefined()
    expect(at(p, 'd6')!.color).toBe('w')
  })
  it('changes type on promotion', () => {
    const c = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1')
    const p0: Piece[] = [{ id: 'x', type: 'p', color: 'w', square: 'a7', captured: false }]
    expect(applyMove(p0, c.move('a8=Q'))[0]).toMatchObject({ square: 'a8', type: 'q' })
  })
})

describe('result', () => {
  it('detects checkmate', () => {
    const { c } = play(['f3', 'e5', 'g4', 'Qh4#'])
    expect(gameResult(c)).toEqual({ over: true, reason: 'checkmate', winner: 'b' })
  })
  it('detects stalemate', () => {
    expect(gameResult(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ over: true, reason: 'stalemate', winner: null })
  })
  it('detects insufficient material', () => {
    expect(gameResult(new Chess('8/8/8/8/8/8/8/k6K w - - 0 1')).reason).toBe('insufficient')
  })
  it('detects threefold', () => {
    const { c } = play(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'])
    expect(gameResult(c).reason).toBe('threefold')
  })
  it('detects fifty-move rule', () => {
    expect(gameResult(new Chess('k7/8/8/8/8/8/7R/7K w - - 100 80')).reason).toBe('fifty')
  })
  it('ongoing game is not over', () => {
    expect(gameResult(new Chess()).over).toBe(false)
  })
})
