import { describe, it, expect } from 'vitest'
import { Chess, validateFen } from 'chess.js'
import { STAGES, PLACEMENT, allLessons } from './academy'
import { uciToMove } from './drill'

// Content loop check (docs/loops.md ④): every position valid, every line legal, every mate is mate.
describe('academy content', () => {
  const drills = [...allLessons(), ...PLACEMENT]
  it('has 6 stages and unique lesson ids', () => {
    expect(STAGES).toHaveLength(6)
    expect(new Set(drills.map(d => d.id)).size).toBe(drills.length)
  })
  for (const d of drills) {
    it(`${d.id}: valid and legal`, () => {
      expect(validateFen(d.fen).ok).toBe(true)
      const c = new Chess(d.fen)
      for (const step of d.solution) {
        const alts = step.split('|')
        for (const a of alts) expect(() => new Chess(c.fen()).move(uciToMove(a)), `${d.id} ${a}`).not.toThrow()
        c.move(uciToMove(alts[0]))
      }
      if (d.goal === 'mate') expect(c.isCheckmate()).toBe(true)
      if (d.goal === 'practice-mate') expect(d.maxMoves).toBeGreaterThan(0)
      if (d.comments) expect(d.comments).toHaveLength(d.solution.length)
    })
  }
})
