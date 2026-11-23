import { create } from 'zustand'
import type { Drill } from './drill'
import { fetchPuzzle, newRating, nextStreak, reschedule, type Card, type Streak } from './puzzles'
import { startDrill, useTrain } from './session'
import { useAcademy } from './progress'
import { STAGES } from './academy'

interface Saved { rating: number; theme: string; solved: number; tried: number; streak: Streak; queue: { drill: Drill; card: Card }[] }
interface PuzzleState extends Saved { loading: boolean; error: string; set(p: Partial<PuzzleState>): void }

const KEY = 'g3d.puzzles'
const init: Saved = { rating: 1000, theme: 'mix', solved: 0, tried: 0, streak: { last: null, count: 0 }, queue: [] }
const load = (): Saved => { try { return { ...init, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return init } }
const persist = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify({ rating: s.rating, theme: s.theme, solved: s.solved, tried: s.tried, streak: s.streak, queue: s.queue })) } catch { /* private mode */ } }

export const usePuzzles = create<PuzzleState>(set => ({ ...load(), loading: false, error: '', set: p => { set(p); persist({ ...usePuzzles.getState(), ...p }) } }))

// Offline fallback: the Academy tactics.
const OFFLINE = STAGES[3].lessons.concat(STAGES[2].lessons.filter(l => l.goal === 'mate'))

export async function nextPuzzle(daily = false) {
  const s = usePuzzles.getState()
  const now = Date.now()
  const due = daily ? undefined : s.queue.find(q => q.card.due <= now)
  let drill: Drill | null = due?.drill ?? null
  if (!drill) {
    s.set({ loading: true, error: '' })
    drill = await fetchPuzzle(s.theme, s.rating, daily)
    s.set({ loading: false })
    if (!drill) {
      drill = OFFLINE[s.tried % OFFLINE.length]
      s.set({ error: 'Lichess is not reachable. Playing an offline puzzle.' })
    }
  }
  const d = drill
  startDrill(d, 'puzzle', solved => {
    const p = usePuzzles.getState()
    const old = p.queue.find(q => q.drill.id === d.id)
    const card = reschedule(old?.card, solved, Date.now())
    const queue = p.queue.filter(q => q.drill.id !== d.id).concat(card ? [{ drill: d, card }] : [])
    const today = new Date().toISOString().slice(0, 10)
    p.set({
      rating: old ? p.rating : newRating(p.rating, d.rating ?? p.rating, solved), // re-tries do not move the rating
      solved: p.solved + (solved ? 1 : 0),
      tried: p.tried + 1,
      queue,
      streak: solved ? nextStreak(p.streak, today) : p.streak,
    })
    if (solved) useAcademy.getState().addXp(5)
    useTrain.setState({ note: solved ? `Solved! Rating ${usePuzzles.getState().rating}.` : `Missed. It comes back tomorrow. Rating ${usePuzzles.getState().rating}.` })
  })
  if (due) useTrain.setState({ note: '🔁 Review: you missed this one before.' })
}
