import type { Drill } from './drill'
import { startDrill, useTrain } from './session'
import { useAcademy } from './progress'

// Positions from my own games that I have since solved.
const KEY = 'g3d.fixed'
export const fixedSet = () => { try { return new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? '[]')) } catch { return new Set<string>() } }
const markFixed = (fen: string) => { try { localStorage.setItem(KEY, JSON.stringify([...fixedSet().add(fen)])) } catch { /* private mode */ } }

let queue: Drill[] = []
let index = 0

export const personalProgress = () => ({ index, total: queue.length })

/** Train a list of my own mistake positions, one after another. */
export function startPersonal(drills: Drill[], at = 0) {
  if (!drills.length) return
  queue = drills
  index = at
  const d = queue[index]
  startDrill(d, 'personal', solved => {
    if (!solved) return
    markFixed(d.fen)
    useAcademy.getState().addXp(5)
    useTrain.setState({ note: index + 1 < queue.length ? 'Fixed! Next position in a moment…' : `All ${queue.length} positions fixed. 🎉` })
    if (index + 1 < queue.length) setTimeout(() => { if (useTrain.getState().drill === d) startPersonal(queue, index + 1) }, 1400)
  })
}

export const nextPersonal = () => { if (index + 1 < queue.length) startPersonal(queue, index + 1) }
