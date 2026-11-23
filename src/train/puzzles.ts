import type { Drill } from './drill'

const DAY = 864e5
export const THEMES: [string, string][] = [
  ['mix', 'Mixed'], ['fork', 'Fork'], ['pin', 'Pin'], ['skewer', 'Skewer'], ['discoveredAttack', 'Discovered attack'],
  ['hangingPiece', 'Hanging piece'], ['mateIn1', 'Mate in 1'], ['mateIn2', 'Mate in 2'], ['backRankMate', 'Back rank'], ['endgame', 'Endgame'],
]

/** Elo with K=32, floor 400. */
export function newRating(user: number, puzzle: number, solved: boolean): number {
  const exp = 1 / (1 + 10 ** ((puzzle - user) / 400))
  return Math.max(400, Math.round(user + 32 * ((solved ? 1 : 0) - exp)))
}

export interface Card { box: number; due: number }
const BOX_DAYS = [1, 3, 7]
/** Missed puzzles return after 1, 3, 7 days; solved in the last box = learned. */
export function reschedule(card: Card | undefined, solved: boolean, now: number): Card | null {
  if (!card) return solved ? null : { box: 0, due: now + BOX_DAYS[0] * DAY }
  if (!solved) return { box: 0, due: now + BOX_DAYS[0] * DAY }
  const box = card.box + 1
  return box >= BOX_DAYS.length ? null : { box, due: now + BOX_DAYS[box] * DAY }
}

export interface Streak { last: string | null; count: number }
export function nextStreak(s: Streak, today: string): Streak {
  if (s.last === today) return s
  const y = new Date(Date.parse(today) - DAY).toISOString().slice(0, 10)
  return { last: today, count: s.last === y ? s.count + 1 : 1 }
}

export const difficultyFor = (r: number) => (r < 1000 ? 'easiest' : r < 1300 ? 'easier' : r < 1700 ? 'normal' : r < 2000 ? 'harder' : 'hardest')

interface ApiPuzzle { puzzle: { id: string; fen: string; solution: string[]; rating: number; themes: string[] } }

const NICE: Record<string, string> = Object.fromEntries(THEMES)
export function toDrill(j: ApiPuzzle): Drill {
  const p = j.puzzle
  const theme = p.themes.find(t => NICE[t]) ?? p.themes[0] ?? 'puzzle'
  const mate = p.themes.some(t => t.startsWith('mate'))
  return {
    id: `lp-${p.id}`, title: `Puzzle · ${NICE[theme] ?? theme}`, text: `Find the best move for ${p.fen.split(' ')[1] === 'w' ? 'White' : 'Black'}.`,
    fen: p.fen, solution: p.solution, goal: mate ? 'mate' : 'line', theme, rating: p.rating,
  }
}

/** Fetch a puzzle from Lichess (free, anonymous, CC0). */
export async function fetchPuzzle(theme: string, rating: number, daily = false): Promise<Drill | null> {
  const url = daily ? 'https://lichess.org/api/puzzle/daily' : `https://lichess.org/api/puzzle/next?${theme === 'mix' ? '' : `angle=${theme}&`}difficulty=${difficultyFor(rating)}`
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return toDrill(await r.json())
  } catch {
    return null
  }
}
