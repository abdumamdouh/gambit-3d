import { describe, it, expect } from 'vitest'
import { winPct, moveAccuracy, classify, gameAccuracy, lossFor } from './eval'

describe('winPct', () => {
  it('is 50 at equal', () => expect(winPct({ cp: 0 })).toBeCloseTo(50))
  it('is about 59 at +1 pawn', () => expect(winPct({ cp: 100 })).toBeCloseTo(59.1, 0))
  it('is symmetric', () => expect(winPct({ cp: 300 }) + winPct({ cp: -300 })).toBeCloseTo(100))
  it('mate for white = 100, for black = 0', () => {
    expect(winPct({ mate: 3 })).toBe(100)
    expect(winPct({ mate: -2 })).toBe(0)
  })
})

describe('moveAccuracy', () => {
  it('100 when nothing lost', () => expect(moveAccuracy(60, 60)).toBeCloseTo(100, 2))
  it('100 when position improved', () => expect(moveAccuracy(40, 70)).toBeCloseTo(100, 2))
  it('drops with loss', () => expect(moveAccuracy(80, 40)).toBeLessThan(20))
  it('never below 0', () => expect(moveAccuracy(100, 0)).toBe(0))
})

describe('lossFor', () => {
  it('white loss from white POV scores', () => expect(lossFor('w', { cp: 0 }, { cp: -300 })).toBeCloseTo((50 - winPct({ cp: -300 })) / 100))
  it('black loss is mirrored', () => expect(lossFor('b', { cp: 0 }, { cp: 300 })).toBeCloseTo((winPct({ cp: 300 }) - 50) / 100))
  it('never negative', () => expect(lossFor('w', { cp: 0 }, { cp: 200 })).toBe(0))
})

describe('classify', () => {
  it('best when engine move', () => expect(classify(0.3, true)).toBe('best'))
  it('blunder >= 0.20', () => expect(classify(0.2, false)).toBe('blunder'))
  it('mistake >= 0.10', () => expect(classify(0.12, false)).toBe('mistake'))
  it('inaccuracy >= 0.05', () => expect(classify(0.06, false)).toBe('inaccuracy'))
  it('good below 0.05', () => expect(classify(0.01, false)).toBe('good'))
})

describe('gameAccuracy', () => {
  it('mean', () => expect(gameAccuracy([100, 50])).toBe(75))
  it('0 when empty', () => expect(gameAccuracy([])).toBe(0))
})
