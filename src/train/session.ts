import { create } from 'zustand'
import { useGame } from '../game/store'
import { useCoach } from '../coach/coach-store'
import { judge, firstPlayerStep, uciToMove, type Drill } from './drill'
import { PLACEMENT, allLessons } from './academy'
import { useAcademy } from './progress'

export type TrainKind = 'lesson' | 'placement' | 'puzzle'
export type TrainStatus = 'playing' | 'wrong' | 'solved' | 'failed'

interface TrainState {
  kind: TrainKind | null
  drill: Drill | null
  step: number
  status: TrainStatus
  fails: number
  note: string
  placementIndex: number
  placementScore: number
  /** Called once when a drill ends (puzzle rating, placement…). */
  onEnd: ((solved: boolean) => void) | null
  set(p: Partial<TrainState>): void
}

export const useTrain = create<TrainState>(set => ({
  kind: null, drill: null, step: 0, status: 'playing', fails: 0, note: '', placementIndex: 0, placementScore: 0, onEnd: null, set,
}))

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

export function startDrill(drill: Drill, kind: TrainKind, onEnd: TrainState['onEnd'] = null) {
  const g = useGame.getState()
  useCoach.getState().set({ hint: null, guard: null })
  useTrain.setState({ kind, drill, status: 'playing', fails: 0, note: '', onEnd, step: firstPlayerStep(drill) })
  if (drill.goal === 'game') {
    g.newGame({ color: 'w', level: drill.level ?? 2, minutes: null })
    return
  }
  const turn = drill.fen.split(' ')[1] as 'w' | 'b'
  g.loadFen(drill.fen, drill.goal === 'practice-mate' ? 'practice' : 'drill', drill.playerColor ?? turn)
  if (drill.goal === 'practice-mate') useGame.setState({ level: 8 })
  if (firstPlayerStep(drill) === 1) void autoReply(0)
}

async function autoReply(i: number) {
  const { drill } = useTrain.getState()
  const id = useGame.getState().gameId
  await wait(550)
  if (!drill || useTrain.getState().drill !== drill || useGame.getState().gameId !== id) return
  const u = drill.solution[i]?.split('|')[0]
  if (u) useGame.getState().move(uciToMove(u))
}

function end(solved: boolean) {
  const t = useTrain.getState()
  if (!t.drill || t.status === 'solved' || t.status === 'failed') return
  useTrain.setState({ status: solved ? 'solved' : 'failed' })
  if (solved && t.kind === 'lesson') useAcademy.getState().complete(t.drill.id)
  t.onEnd?.(solved)
}

/** Player move inside a lesson/puzzle. */
export async function drillMove(from: string, to: string, promotion?: string) {
  const t = useTrain.getState()
  const g = useGame.getState()
  if (!t.drill || t.status === 'solved' || t.status === 'failed') return
  if (!promotion && g.legalMoves(from).some(m => m.to === to && m.promotion)) { g.tryMove(from, to); return }
  const fen = g.fen
  const v = judge(t.drill, t.step, fen, { from, to, promotion })
  if (!g.move({ from, to, promotion })) return
  useCoach.getState().set({ hint: null })
  if (v === 'wrong') {
    const fails = t.fails + 1
    useTrain.setState({ status: 'wrong', fails, note: 'Not quite. Look again.' })
    if (t.kind !== 'lesson') { end(false); return }
    await wait(900)
    if (useTrain.getState().drill === t.drill) { useGame.getState().undo(); useTrain.setState({ status: 'playing', note: '' }) }
    return
  }
  const note = t.drill.comments?.[t.step] || (v === 'solved' ? '' : 'Good!')
  if (v === 'solved') { useTrain.setState({ note }); end(true); return }
  useTrain.setState({ step: t.step + 2, note, status: 'playing' })
  await autoReply(t.step + 1)
  const c = t.drill.comments?.[t.step + 1]
  if (c) useTrain.setState({ note: c })
}

/** Show the expected move as an arrow. */
export function drillHint() {
  const t = useTrain.getState()
  const u = t.drill?.solution[t.step]?.split('|')[0]
  if (!u) return
  const m = uciToMove(u)
  useCoach.getState().set({ hint: { from: m.from, to: m.to, san: '' } })
  useTrain.setState({ fails: t.fails + 1 })
}

/** Practice and graduation: watch the game result. */
export function checkTrainResult() {
  const t = useTrain.getState()
  const g = useGame.getState()
  if (!t.drill || (t.drill.goal !== 'practice-mate' && t.drill.goal !== 'game') || t.status !== 'playing') return
  if (g.result.over) { end(g.result.winner === g.playerColor && (t.drill.goal === 'game' || g.result.reason === 'checkmate')); return }
  const myMoves = g.history.filter(h => h.color === g.playerColor).length
  if (t.drill.maxMoves && myMoves >= t.drill.maxMoves) { useTrain.setState({ note: `Out of moves (${t.drill.maxMoves}). Try again!` }); end(false) }
}

export function startPlacement() {
  useTrain.setState({ placementIndex: 0, placementScore: 0 })
  nextPlacement()
}

function nextPlacement() {
  const { placementIndex } = useTrain.getState()
  const d = PLACEMENT[placementIndex]
  startDrill(d, 'placement', solved => {
    const s = useTrain.getState()
    const score = s.placementScore + (solved ? 1 : 0)
    useTrain.setState({ placementScore: score, note: solved ? 'Correct!' : 'Not this one.' })
    setTimeout(() => {
      if (placementIndex + 1 < PLACEMENT.length) { useTrain.setState({ placementIndex: placementIndex + 1 }); nextPlacement() }
      else { useAcademy.getState().setPlacement(score); useTrain.setState({ status: 'solved', placementIndex: PLACEMENT.length, note: `Placement done: ${score}/5. Stages 1–${Math.min(6, score + 1)} are open.` }) }
    }, 1200)
  })
}

export function nextLesson(): Drill | null {
  const t = useTrain.getState()
  const all = allLessons()
  const i = all.findIndex(l => l.id === t.drill?.id)
  return i >= 0 && i + 1 < all.length ? all[i + 1] : null
}

export function exitTrain() {
  useTrain.setState({ kind: null, drill: null, onEnd: null, note: '' })
  useCoach.getState().set({ hint: null })
}
