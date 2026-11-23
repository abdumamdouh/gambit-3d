import { create } from 'zustand'
import { Chess } from 'chess.js'
import { useGame } from '../game/store'
import { engine } from '../engine/instance'
import { reviewPly, type Analysis } from './review'
import { buildRecord, type GameRecord, type Phase, type ReviewedPly } from '../progress/skills'
import { saveGame } from '../progress/db'

const VAL: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 }
function phaseOf(fen: string, ply: number): Phase {
  const heavy = new Chess(fen).board().flat().reduce((s, c) => s + (c ? VAL[c.type] ?? 0 : 0), 0)
  if (heavy <= 13) return 'endgame'
  return ply <= 20 ? 'opening' : 'middlegame'
}

interface ReviewState {
  status: 'idle' | 'running' | 'done'
  open: boolean
  progress: number
  plies: ReviewedPly[]
  pv: string[][]
  record: GameRecord | null
  index: number
  gameId: number
  set(p: Partial<ReviewState>): void
}

export const useReview = create<ReviewState>(set => ({ status: 'idle', open: false, progress: 0, plies: [], pv: [], record: null, index: 0, gameId: -1, set }))

/** Analyse the whole finished game, then save its Skill Report. */
export async function runReview(opts: { save?: boolean } = {}) {
  const g = useGame.getState()
  const r = useReview.getState()
  if (r.gameId === g.gameId && r.status !== 'idle') { r.set({ open: true }); return }
  // Snapshot the game: the review must finish and save even if a new game starts meanwhile (review #1).
  const { history, gameId, startFen, result, playerColor, level, mode, fromHistory } = g
  const live = () => useReview.getState().gameId === gameId
  useReview.setState({ status: 'running', open: true, progress: 0, plies: [], pv: [], record: null, index: 0, gameId })
  const fens = [startFen, ...history.map(h => h.after)]
  const an: Analysis[] = []
  for (let i = 0; i < fens.length; i++) {
    const a = await engine.analyse(fens[i], live() ? 12 : 8)
    an.push(a ?? { score: { cp: 0 }, bestMove: null, pv: [] })
    if (live()) useReview.setState({ progress: (i + 1) / fens.length })
  }
  const plies: ReviewedPly[] = history.map((m, i) => ({ ...reviewPly(fens[i], m, an[i], an[i + 1], i + 1), phase: phaseOf(fens[i], i + 1), fen: fens[i] }))
  let record: GameRecord | null = null
  if (opts.save !== false && !fromHistory && result.over && mode === 'game' && plies.filter(p => p.color === playerColor).length >= 3) {
    const pgnChess = new Chess(startFen)
    history.forEach(h => pgnChess.move(h.san))
    record = buildRecord(plies, {
      color: playerColor, level, date: Date.now(), reason: result.reason ?? '', pgn: pgnChess.pgn(),
      result: result.winner == null ? 'draw' : result.winner === playerColor ? 'win' : 'loss',
    })
    await saveGame(record)
  }
  if (!live()) return
  // Start on the player's worst move: that is where the lesson is.
  const mine = plies.filter(p => p.color === playerColor)
  const worst = mine.reduce((w, p) => (p.loss > w.loss ? p : w), mine[0] ?? plies[0])
  useReview.setState({ status: 'done', plies, pv: an.slice(1).map(a => a.pv), record, index: worst ? worst.ply - 1 : 0 })
  if (worst) useGame.getState().setViewPly(worst.ply)
}

export function closeReview() {
  useReview.getState().set({ open: false })
  useGame.getState().setViewPly(null)
}
