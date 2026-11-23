import type { GameRecord, Mistake } from '../progress/skills'
import { gameAccuracy } from './eval'

export type WeaknessId = 'hangs' | 'missedTactics' | 'allowsMate' | 'blunders' | 'lateCastle' | 'earlyQueen' | 'opening' | 'endgame'
export interface Weakness {
  id: WeaknessId
  title: string
  detail: string
  /** 0..1, higher = fix first. */
  severity: number
  perGame: number
  trend: 'better' | 'worse' | 'same' | null
  lessons: string[]
  theme: string
  examples: Mistake[]
}
export interface StyleProfile {
  games: number
  weaknesses: Weakness[]
  strengths: string[]
  openings: { line: string; games: number; score: number; accuracy: number }[]
}

const DEF: Record<WeaknessId, { title: string; lessons: string[]; theme: string; strength: string }> = {
  hangs: { title: 'Leaving pieces undefended', lessons: ['s4-fork', 's4-double'], theme: 'hangingPiece', strength: 'You rarely hang pieces.' },
  missedTactics: { title: 'Missing winning tactics', lessons: ['s4-fork', 's4-skewer', 's4-disc'], theme: 'fork', strength: 'You find most tactical shots.' },
  allowsMate: { title: 'Allowing checkmate', lessons: ['s3-backrank', 's3-smother', 's3-ladder'], theme: 'mateIn1', strength: 'You keep your king safe from mates.' },
  blunders: { title: 'Big blunders', lessons: ['s4-fork'], theme: 'mix', strength: 'Few big blunders.' },
  lateCastle: { title: 'Castling late (or never)', lessons: ['s2-castle', 's5-italian'], theme: 'mix', strength: 'You castle early.' },
  earlyQueen: { title: 'Bringing the queen out too early', lessons: ['s5-italian', 's5-london'], theme: 'mix', strength: 'You develop minor pieces before the queen.' },
  opening: { title: 'Weak openings', lessons: ['s5-italian', 's5-qg', 's5-london'], theme: 'mix', strength: 'Solid openings.' },
  endgame: { title: 'Weak endgames', lessons: ['s3-kq', 's3-kr'], theme: 'endgame', strength: 'Good endgame technique.' },
}

type Metric = { perGame: (g: GameRecord) => number | null; scale: number; detail: (v: number) => string; examples?: (m: Mistake) => boolean }
const count = (g: GameRecord, f: (m: Mistake) => boolean) => (g.mistakes ? g.mistakes.filter(f).length : null)
const METRICS: Record<WeaknessId, Metric> = {
  hangs: { perGame: g => count(g, m => m.tags.includes('hangs')), scale: 1, detail: v => `About ${v.toFixed(1)} undefended piece${v >= 1.5 ? 's' : ''} per game.`, examples: m => m.tags.includes('hangs') },
  missedTactics: { perGame: g => count(g, m => m.tags.includes('missedWin') || m.tags.includes('missedMate')), scale: 1, detail: v => `About ${v.toFixed(1)} missed winning shot${v >= 1.5 ? 's' : ''} per game.`, examples: m => m.tags.includes('missedWin') || m.tags.includes('missedMate') },
  allowsMate: { perGame: g => count(g, m => m.tags.includes('allowsMate')), scale: 0.5, detail: v => `Allowed a mate in ${Math.round(v * 100)}% of games.`, examples: m => m.tags.includes('allowsMate') },
  blunders: { perGame: g => g.counts.blunder, scale: 2, detail: v => `${v.toFixed(1)} blunders per game.`, examples: m => m.label === 'blunder' },
  lateCastle: { perGame: g => (g.castlePly === undefined ? null : g.castlePly === null || g.castlePly > 20 ? 1 : 0), scale: 1.25, detail: v => `No castling by move 10 in ${Math.round(v * 100)}% of games.` },
  earlyQueen: { perGame: g => (g.earlyQueen === undefined ? null : g.earlyQueen ? 1 : 0), scale: 1.6, detail: v => `Queen moved in the first 5 moves in ${Math.round(v * 100)}% of games.` },
  opening: { perGame: g => (g.phases.opening === null ? null : Math.max(0, 75 - g.phases.opening) / 40), scale: 1, detail: () => 'Your opening accuracy is below 75%.', examples: m => m.phase === 'opening' },
  endgame: { perGame: g => (g.phases.endgame === null ? null : Math.max(0, 75 - g.phases.endgame) / 40), scale: 1, detail: () => 'Your endgame accuracy is below 75%.', examples: m => m.phase === 'endgame' },
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Read every saved game and find what keeps going wrong. */
export function analyzeStyle(records: GameRecord[]): StyleProfile {
  const games = [...records].sort((a, b) => a.date - b.date)
  const weaknesses: Weakness[] = []
  const strengths: string[] = []
  for (const id of Object.keys(METRICS) as WeaknessId[]) {
    const m = METRICS[id]
    const vals = games.map(g => ({ g, v: m.perGame(g) })).filter((x): x is { g: GameRecord; v: number } => x.v !== null)
    if (vals.length < 2) continue
    const perGame = mean(vals.map(x => x.v))
    const severity = Math.min(1, perGame / m.scale)
    let trend: Weakness['trend'] = null
    if (vals.length >= 6) {
      const recent = mean(vals.slice(-5).map(x => x.v)), before = mean(vals.slice(0, -5).map(x => x.v))
      trend = recent < before * 0.8 ? 'better' : recent > before * 1.2 + 0.05 ? 'worse' : 'same'
    }
    if (severity < 0.15) { strengths.push(DEF[id].strength); continue }
    const examples = m.examples ? games.flatMap(g => g.mistakes ?? []).filter(m.examples).sort((a, b) => b.loss - a.loss).slice(0, 6) : []
    weaknesses.push({ id, title: DEF[id].title, detail: m.detail(perGame), severity, perGame, trend, lessons: DEF[id].lessons, theme: DEF[id].theme, examples })
  }
  weaknesses.sort((a, b) => b.severity - a.severity)

  const byLine = new Map<string, GameRecord[]>()
  for (const g of games) if (g.opening) byLine.set(g.opening, [...(byLine.get(g.opening) ?? []), g])
  const openings = [...byLine].map(([line, gs]) => ({
    line, games: gs.length, score: mean(gs.map(g => (g.result === 'win' ? 1 : g.result === 'draw' ? 0.5 : 0))), accuracy: Math.round(gameAccuracy(gs.map(g => g.accuracy))),
  })).sort((a, b) => b.games - a.games).slice(0, 5)

  return { games: games.length, weaknesses, strengths, openings }
}
