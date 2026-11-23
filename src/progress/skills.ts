import type { Color } from '../game/pieces'
import type { Label } from '../coach/eval'
import type { PlyReview } from '../coach/review'
import { gameAccuracy } from '../coach/eval'

export type Phase = 'opening' | 'middlegame' | 'endgame'
export type ReviewedPly = PlyReview & { phase: Phase; fen?: string }

/** One of my inaccurate moves, kept so lessons can be built from it. */
export interface Mistake { fen: string; san: string; best: string; bestSan: string; label: Label; tags: PlyReview['tags']; phase: Phase; loss: number; ply: number }
export interface Skills { pieceSafety: number; development: number; tactics: number | null; endgame: number | null; calculation: number }
export interface GameRecord {
  id: string
  date: number
  color: Color
  level: number
  result: 'win' | 'loss' | 'draw'
  reason: string
  accuracy: number
  plies: number
  counts: Record<Label, number>
  phases: Record<Phase, number | null>
  skills: Skills
  pgn: string
  // Added with the style coach (older records may not have them).
  mistakes?: Mistake[]
  opening?: string
  castlePly?: number | null
  earlyQueen?: boolean
}

export const LEVEL_ELO = [400, 700, 1000, 1320, 1600, 1900, 2300, 2800]
const avg = (xs: number[]) => (xs.length ? gameAccuracy(xs) : null)
const clamp = (x: number) => Math.max(0, Math.min(100, x))
const MINORS: Record<Color, string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] }

export function buildRecord(all: ReviewedPly[], meta: { color: Color; level: number; result: GameRecord['result']; reason: string; date: number; pgn: string }): GameRecord {
  const mine = all.filter(p => p.color === meta.color)
  const counts: Record<Label, number> = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
  mine.forEach(p => counts[p.label]++)
  const has = (t: PlyReview['tags'][number]) => mine.filter(p => p.tags.includes(t)).length

  // Development: castled (+40) and each minor piece moved off its home square (+15) in the first 10 moves.
  const early = mine.filter(p => p.ply <= 20)
  const castled = early.some(p => p.san.startsWith('O-O'))
  const minors = new Set(early.filter(p => /^[NB]/.test(p.san) && MINORS[meta.color].includes(p.from)).map(p => p.from)).size

  // Tactics: chances = tactical shots missed + tactical shots found (best capture or check).
  const found = mine.filter(p => p.label === 'best' && /x|\+|#/.test(p.san)).length
  const chances = found + has('missedWin') + has('missedMate')

  const byPhase = (ph: Phase) => avg(mine.filter(p => p.phase === ph).map(p => p.accuracy))
  return {
    id: `${meta.date}`,
    date: meta.date,
    color: meta.color,
    level: meta.level,
    result: meta.result,
    reason: meta.reason,
    accuracy: gameAccuracy(mine.map(p => p.accuracy)),
    plies: mine.length,
    counts,
    phases: { opening: byPhase('opening'), middlegame: byPhase('middlegame'), endgame: byPhase('endgame') },
    skills: {
      pieceSafety: clamp(100 - 25 * has('hangs')),
      development: clamp((castled ? 40 : 0) + 15 * minors),
      tactics: chances ? Math.round((found / chances) * 100) : null,
      endgame: byPhase('endgame'),
      calculation: clamp(100 - 20 * counts.blunder - 8 * counts.mistake),
    },
    pgn: meta.pgn,
    mistakes: mine
      .filter(p => (p.label === 'inaccuracy' || p.label === 'mistake' || p.label === 'blunder') && p.best && p.fen)
      .map(p => ({ fen: p.fen!, san: p.san, best: p.best!.from + p.best!.to + (p.best!.promotion ?? ''), bestSan: p.bestSan ?? '', label: p.label, tags: p.tags, phase: p.phase, loss: p.loss, ply: p.ply })),
    opening: all.slice(0, 4).map(p => p.san).join(' '),
    castlePly: mine.find(p => p.san.startsWith('O-O'))?.ply ?? null,
    earlyQueen: mine.some(p => p.ply <= 10 && p.san.startsWith('Q')),
  }
}

const DAY = 864e5
export type Verdict = 'improving' | 'flat' | 'dropping' | 'not-enough'

/** Last 7 days vs the 7 before (spec §7). */
export function verdict(records: GameRecord[], now: number): Verdict {
  const win = (from: number, to: number) => records.filter(r => r.date > now - to * DAY && r.date <= now - from * DAY).map(r => r.accuracy)
  const a = win(0, 7), b = win(7, 14)
  if (a.length < 2 || b.length < 2) return 'not-enough'
  const d = gameAccuracy(a) - gameAccuracy(b)
  return d >= 2 ? 'improving' : d <= -2 ? 'dropping' : 'flat'
}

/** Performance rating over the last 10 games: opponent Elo ± 400 per full point. */
export function ratingEstimate(records: GameRecord[]): number | null {
  const last = [...records].sort((x, y) => y.date - x.date).slice(0, 10)
  if (!last.length) return null
  const perf = last.map(r => LEVEL_ELO[r.level - 1] + 800 * ((r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0) - 0.5))
  return Math.max(0, Math.round(gameAccuracy(perf)))
}
