import { describe, it, expect } from 'vitest'
import { speakable } from './voice'

describe('speakable', () => {
  it('reads pieces', () => expect(speakable('Try Nf3.')).toBe('Try knight f3.'))
  it('reads captures and checks', () => expect(speakable('Bxf7+ wins')).toBe('bishop takes f7, check wins'))
  it('reads pawn captures', () => expect(speakable('exd5')).toBe('e takes d5'))
  it('reads castling and mate', () => expect(speakable('O-O-O then Qh4#')).toBe('castles long then queen h4, checkmate'))
  it('reads promotion', () => expect(speakable('e8=Q')).toBe('e8 promotes to queen'))
  it('drops html and emoji', () => expect(speakable('<b>Rook</b> ✅ done')).toBe('Rook done'))
})
