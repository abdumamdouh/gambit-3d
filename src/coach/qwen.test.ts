import { describe, it, expect } from 'vitest'
import { onlyKnownMoves } from './qwen'

const sans = ['Qh5', 'Nf3', 'Nxh5']
const squares = ['d1', 'h5', 'g1', 'f3', 'f6']

describe('onlyKnownMoves', () => {
  it('accepts text that uses known moves', () => expect(onlyKnownMoves('Qh5 lets Black play Nxh5. Nf3 was better.', sans, squares)).toBe(true))
  it('accepts check marks on known moves', () => expect(onlyKnownMoves('After Nxh5+ you lose.', sans, squares)).toBe(true))
  it('rejects an invented move', () => expect(onlyKnownMoves('Try Bc4 instead.', sans, squares)).toBe(false))
  it('rejects an unknown square', () => expect(onlyKnownMoves('Your pawn on e4 is weak.', sans, squares)).toBe(false))
  it('accepts a known square', () => expect(onlyKnownMoves('The queen on h5 is lost.', sans, squares)).toBe(true))
  it('rejects castling when not listed', () => expect(onlyKnownMoves('Castle with O-O.', sans, squares)).toBe(false))
  it('ignores plain words', () => expect(onlyKnownMoves('Be careful and develop your pieces.', sans, squares)).toBe(true))
})
