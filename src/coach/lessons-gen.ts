import type { Drill } from '../train/drill'
import type { StyleProfile } from './style'

export interface Plan { drills: Drill[]; lessons: string[]; theme: string }

const LABEL: Record<string, string> = { inaccuracy: 'an inaccuracy', mistake: 'a mistake', blunder: 'a blunder' }

/** Personal lessons: replay my worst positions, plus Academy lessons and puzzles that match my weaknesses. */
export function generatePlan(p: StyleProfile, fixed: Set<string>, max = 8): Plan {
  const seen = new Set<string>()
  const drills: Drill[] = []
  for (const w of p.weaknesses.slice(0, 3)) {
    for (const m of [...w.examples].sort((a, b) => b.loss - a.loss)) {
      if (seen.has(m.fen) || fixed.has(m.fen) || drills.length >= max) continue
      seen.add(m.fen)
      drills.push({
        id: `pm-${drills.length}-${m.ply}`,
        title: `From your games · ${w.title}`,
        text: `In one of your games you played ${m.san} here — ${LABEL[m.label] ?? 'a weak move'}. Find the move Stockfish wanted.`,
        fen: m.fen,
        solution: [m.best],
        goal: 'line',
        theme: w.id,
      })
    }
  }
  const lessons = [...new Set(p.weaknesses.slice(0, 3).flatMap(w => w.lessons))].slice(0, 4)
  return { drills, lessons, theme: p.weaknesses[0]?.theme ?? 'mix' }
}
