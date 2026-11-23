import { create } from 'zustand'
import { STAGES } from './academy'

interface AcademyState {
  done: string[]
  xp: number
  placement: number | null
  complete(id: string, xp?: number): void
  setPlacement(score: number): void
  addXp(n: number): void
}

const KEY = 'g3d.academy'
const load = (): Pick<AcademyState, 'done' | 'xp' | 'placement'> => {
  try { return { done: [], xp: 0, placement: null, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { done: [], xp: 0, placement: null } }
}
const save = (s: Pick<AcademyState, 'done' | 'xp' | 'placement'>) => { try { localStorage.setItem(KEY, JSON.stringify({ done: s.done, xp: s.xp, placement: s.placement })) } catch { /* private mode */ } }

export const useAcademy = create<AcademyState>((set, get) => ({
  ...load(),
  complete(id, xp = 10) {
    if (get().done.includes(id)) return
    set({ done: [...get().done, id], xp: get().xp + xp })
    save(get())
  },
  setPlacement(score) { set({ placement: score }); save(get()) },
  addXp(n) { set({ xp: get().xp + n }); save(get()) },
}))

/** Stage k is open if placement reached it, or half of stage k-1 is done. */
export function isUnlocked(stage: number, done: string[], placement: number | null) {
  if (stage === 1 || (placement !== null && stage <= placement + 1)) return true
  const prev = STAGES[stage - 2].lessons
  return prev.filter(l => done.includes(l.id)).length >= Math.ceil(prev.length / 2)
}
