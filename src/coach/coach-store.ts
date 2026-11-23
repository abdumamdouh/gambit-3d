import { create } from 'zustand'
import type { Score } from './eval'

const read = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1' } catch { return d } }
const write = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0') } catch { /* private mode */ } }

export interface GuardPrompt { from: string; to: string; san: string; lossPct: number; bestSan: string | null }

interface CoachState {
  score: Score | null
  hint: { from: string; to: string; san: string } | null
  hintsUsed: number
  checking: boolean
  guardOn: boolean
  aiCoach: boolean
  guard: GuardPrompt | null
  set(p: Partial<Omit<CoachState, 'set' | 'toggle'>>): void
  toggle(k: 'guardOn' | 'aiCoach'): void
}

export const useCoach = create<CoachState>((set, get) => ({
  score: null,
  hint: null,
  hintsUsed: 0,
  checking: false,
  guardOn: read('g3d.guard', true),
  aiCoach: read('g3d.ai', false),
  guard: null,
  set,
  toggle(k) {
    const v = !get()[k]
    write(k === 'guardOn' ? 'g3d.guard' : 'g3d.ai', v)
    set({ [k]: v } as Partial<CoachState>)
  },
}))

// ponytail: tiny FIFO cache so the guard can reuse the eval bar's last analysis.
const cache = new Map<string, Score>()
export function remember(fen: string, s: Score) {
  cache.set(fen, s)
  if (cache.size > 200) cache.delete(cache.keys().next().value!)
}
export const recall = (fen: string) => cache.get(fen)
