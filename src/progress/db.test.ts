import { describe, it, expect } from 'vitest'
import { isRecord } from './db'

const ok = { id: '1', date: 1, accuracy: 70, skills: {}, counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, phases: { opening: null, middlegame: null, endgame: null }, result: 'win', level: 3, color: 'w' }

describe('isRecord (review #12)', () => {
  it('accepts a full record', () => expect(isRecord(ok)).toBe(true))
  it('rejects missing counts', () => expect(isRecord({ ...ok, counts: undefined })).toBe(false))
  it('rejects missing phases', () => expect(isRecord({ ...ok, phases: 'x' })).toBe(false))
  it('rejects garbage', () => expect(isRecord(null)).toBe(false))
})
