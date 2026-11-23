import { useGame } from '../game/store'
import { engine } from '../engine/instance'
import { lossFor } from './eval'
import { fenAfter, uciLineToSan } from './san'
import { recall, remember, useCoach } from './coach-store'

async function scoreOf(fen: string, depth: number) {
  const known = recall(fen)
  if (known) return known
  const r = await engine.analyse(fen, depth)
  if (r) remember(fen, r.score)
  return r?.score ?? null
}

/** Player move with the blunder guard in front of it. */
export async function guardedMove(from: string, to: string) {
  const g = useGame.getState()
  const c = useCoach.getState()
  const isPromo = g.legalMoves(from).some(m => m.to === to && m.promotion)
  if (!c.guardOn || isPromo || !engine.ok) return g.tryMove(from, to)
  const fen = g.fen
  c.set({ checking: true })
  g.select(null)
  const after = fenAfter(fen, { from, to })
  const [before, aft] = [await scoreOf(fen, 10), await scoreOf(after, 10)]
  useCoach.getState().set({ checking: false })
  if (useGame.getState().fen !== fen) return false
  if (before && aft) {
    const loss = lossFor(g.playerColor, before, aft)
    if (loss >= 0.2) {
      const best = (await engine.analyse(fen, 10))?.bestMove
      const bestSan = best ? uciLineToSan(fen, [best.from + best.to + (best.promotion ?? '')])[0] ?? null : null
      const san = uciLineToSan(fen, [from + to])[0]
      useCoach.getState().set({ guard: { from, to, san, lossPct: Math.round(loss * 100), bestSan } })
      return false
    }
  }
  return useGame.getState().tryMove(from, to)
}

export async function showHint() {
  const g = useGame.getState()
  const fen = g.fen
  useCoach.getState().set({ checking: true })
  const r = await engine.analyse(fen, 12)
  useCoach.getState().set({ checking: false })
  if (!r?.bestMove || useGame.getState().fen !== fen) return
  const san = uciLineToSan(fen, [r.bestMove.from + r.bestMove.to + (r.bestMove.promotion ?? '')])[0]
  remember(fen, r.score)
  useCoach.getState().set({ hint: { from: r.bestMove.from, to: r.bestMove.to, san }, hintsUsed: useCoach.getState().hintsUsed + 1, score: r.score })
}

/** Eval bar: analyse every new position. */
export async function refreshEval(fen: string) {
  const s = await scoreOf(fen, 12)
  if (s && useGame.getState().fen === fen) useCoach.getState().set({ score: s })
}
