import { describe, it, expect } from 'vitest'
import { profileFacts, templateLetter } from './letter'
import type { StyleProfile } from './style'

const p: StyleProfile = {
  games: 4, strengths: ['You castle early.'],
  openings: [{ line: 'e4 e5 Nf3 Nc6', games: 3, score: 0.5, accuracy: 72 }],
  weaknesses: [{ id: 'hangs', title: 'Leaving pieces undefended', detail: 'About 1.2 undefended pieces per game.', severity: 1, perGame: 1.2, trend: 'better', lessons: [], theme: 'hangingPiece', examples: [{ fen: 'SECRET-FEN', san: 'Qh5', best: 'g1f3', bestSan: 'Nf3', label: 'blunder', tags: ['hangs'], phase: 'opening', loss: 0.3, ply: 5 }] }],
}

describe('letter', () => {
  it('facts carry stats but no positions', () => {
    const f = profileFacts(p)
    expect(f).toMatch(/Games analysed: 4/)
    expect(f).toMatch(/Leaving pieces undefended/)
    expect(f).toMatch(/Trend: better/)
    expect(f).not.toMatch(/SECRET-FEN/)
  })
  it('template lists priorities and a strength', () => {
    const t = templateLetter(p)
    expect(t).toMatch(/1\. Leaving pieces undefended/)
    expect(t).toMatch(/castle early/)
  })
  it('template handles no games', () => expect(templateLetter({ ...p, games: 0 })).toMatch(/Finish a few games/))
})
