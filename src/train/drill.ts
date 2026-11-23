import { Chess } from 'chess.js'
import type { Color } from '../game/pieces'

/**
 * One scripted exercise: lesson step, opening line or puzzle.
 * `solution` alternates player / opponent moves (UCI). "a|b" accepts either move.
 */
export interface Drill {
  id: string
  title: string
  text: string
  fen: string
  solution: string[]
  /** mate: any mating move is also right. practice: play it out vs the engine. game: win a normal game. */
  goal?: 'line' | 'mate' | 'practice-mate' | 'game'
  playerColor?: Color
  comments?: string[]
  maxMoves?: number
  level?: number
  theme?: string
  rating?: number
}

export type Verdict = 'correct' | 'solved' | 'wrong'

const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '')

/** Judge the player's move at `step` (an index into solution). */
export function judge(d: Drill, step: number, fenBefore: string, move: { from: string; to: string; promotion?: string }): Verdict {
  const uci = uciOf(move)
  const ok = d.solution[step]?.split('|') ?? []
  const lastPlayerStep = d.solution.length - 1 - ((d.solution.length - 1 - firstPlayerStep(d)) % 2)
  const done = step >= lastPlayerStep
  if (ok.includes(uci)) return done ? 'solved' : 'correct'
  // Lichess rule: in a mate puzzle any move that mates is right.
  try {
    const c = new Chess(fenBefore)
    c.move(move)
    if (c.isCheckmate()) return 'solved'
  } catch { /* illegal */ }
  return 'wrong'
}

/** 0 when the player moves first, 1 when the opponent opens (e.g. Black openings). */
export function firstPlayerStep(d: Drill): number {
  const turn = d.fen.split(' ')[1] as Color
  return !d.playerColor || d.playerColor === turn ? 0 : 1
}

export const uciToMove = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined })
