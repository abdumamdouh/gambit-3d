import { describe, it, expect } from 'vitest'
import { generatePlan } from './lessons-gen'
import type { StyleProfile } from './style'
import type { Mistake } from '../progress/skills'

const m = (fen: string, loss: number, tags: Mistake['tags'] = ['hangs']): Mistake => ({ fen, san: 'Qh5', best: 'g1f3', bestSan: 'Nf3', label: 'blunder', tags, phase: 'opening', loss, ply: 5 })
const profile: StyleProfile = {
  games: 3, strengths: [], openings: [],
  weaknesses: [
    { id: 'hangs', title: 'Leaving pieces undefended', detail: '', severity: 0.9, perGame: 1.2, trend: null, lessons: ['s4-fork', 's4-double'], theme: 'hangingPiece', examples: [m('A', 0.3), m('B', 0.5), m('A', 0.3)] },
    { id: 'lateCastle', title: 'Castling late', detail: '', severity: 0.5, perGame: 0.6, trend: null, lessons: ['s2-castle', 's4-fork'], theme: 'mix', examples: [] },
  ],
}

describe('generatePlan', () => {
  const plan = generatePlan(profile, new Set())
  it('builds drills from my own positions, worst first, no duplicates', () => {
    expect(plan.drills.map(d => d.fen)).toEqual(['B', 'A'])
    expect(plan.drills[0]).toMatchObject({ solution: ['g1f3'], goal: 'line' })
    expect(plan.drills[0].text).toMatch(/Qh5/)
  })
  it('skips positions I already fixed', () => expect(generatePlan(profile, new Set(['B'])).drills.map(d => d.fen)).toEqual(['A']))
  it('recommends academy lessons from the top weaknesses, unique', () => expect(plan.lessons).toEqual(['s4-fork', 's4-double', 's2-castle']))
  it('picks the puzzle theme of the top weakness', () => expect(plan.theme).toBe('hangingPiece'))
  it('is empty without weaknesses', () => expect(generatePlan({ ...profile, weaknesses: [] }, new Set()).drills).toEqual([]))
})
