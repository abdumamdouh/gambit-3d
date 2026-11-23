import type { Color } from '../game/pieces'

/** Engine score from White's point of view. */
export type Score = { cp?: number; mate?: number }
export type Label = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

/** Lichess win-percentage model, 0..100 for White. */
export function winPct(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? 100 : 0
  const cp = Math.max(-1000, Math.min(1000, s.cp ?? 0))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/** Win% for the side that moved. */
export const moverPct = (color: Color, s: Score) => (color === 'w' ? winPct(s) : 100 - winPct(s))

/** Lichess per-move accuracy from the mover's win% before and after. */
export function moveAccuracy(before: number, after: number): number {
  const d = Math.max(0, before - after)
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * d) - 3.1669))
}

/** Win-probability lost by the mover, 0..1. */
export const lossFor = (color: Color, before: Score, after: Score) => Math.max(0, (moverPct(color, before) - moverPct(color, after)) / 100)

export function classify(loss: number, isBest: boolean): Label {
  if (isBest) return 'best'
  if (loss >= 0.2) return 'blunder'
  if (loss >= 0.1) return 'mistake'
  if (loss >= 0.05) return 'inaccuracy'
  return 'good'
}

export const gameAccuracy = (accs: number[]) => (accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0)

/** "+1.3", "-0.4", "M3", "-M2" for the eval bar. */
export function fmtScore(s: Score): string {
  if (s.mate !== undefined) return `${s.mate < 0 ? '-' : ''}M${Math.abs(s.mate)}`
  const v = (s.cp ?? 0) / 100
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
}
