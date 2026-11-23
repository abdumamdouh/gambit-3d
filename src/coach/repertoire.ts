import { Chess } from 'chess.js'
import type { Color } from '../game/pieces'
import type { Drill } from '../train/drill'

export interface OwnPos { fen: string; uci: string; san: string; count: number; ply: number }
export interface Explorer { moves: { uci: string; san: string; white: number; draws: number; black: number }[] }
export interface Verdict { pos: OwnPos; total: number; share: number; deviation: boolean; top: { uci: string; san: string; share: number }[] }

/** My own moves in the first `maxPly` plies of my saved games, grouped, most played first. */
export function ownPositions(games: { pgn: string; color: Color }[], maxPly = 10): OwnPos[] {
  const map = new Map<string, OwnPos>()
  for (const g of games) {
    const c = new Chess()
    try { c.loadPgn(g.pgn) } catch { continue }
    const moves = c.history({ verbose: true })
    moves.slice(0, maxPly).forEach((m, i) => {
      if (m.color !== g.color) return
      const uci = m.from + m.to + (m.promotion ?? '')
      const key = m.before + '|' + uci
      const cur = map.get(key)
      if (cur) cur.count++
      else map.set(key, { fen: m.before, uci, san: m.san, count: 1, ply: i + 1 })
    })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.ply - b.ply)
}

const MIN_GAMES = 50
const MAIN = 0.1

/** Compare my move with master games. null = not enough master games to judge. */
export function judge(pos: OwnPos, ex: Explorer): Verdict | null {
  const tot = (m: Explorer['moves'][number]) => m.white + m.draws + m.black
  const total = ex.moves.reduce((s, m) => s + tot(m), 0)
  if (total < MIN_GAMES) return null
  const mine = ex.moves.find(m => m.uci === pos.uci)
  const share = mine ? tot(mine) / total : 0
  const top = ex.moves.map(m => ({ uci: m.uci, san: m.san, share: tot(m) / total })).filter(m => m.share >= MAIN && m.uci !== pos.uci).slice(0, 3)
  return { pos, total, share, deviation: share < 0.05 && top.length > 0, top }
}

export function toDrill(v: Verdict): Drill {
  return {
    id: `rep-${v.pos.ply}-${v.pos.uci}`,
    title: 'Opening repertoire',
    text: `You usually play ${v.pos.san} here, but masters almost never do. Play one of the main moves.`,
    fen: v.pos.fen,
    solution: [v.top.map(t => t.uci).join('|')],
    goal: 'line',
  }
}

// ponytail: localStorage cache per FEN; master stats change slowly. Clear the key to refresh.
const KEY = 'g3d.explorer'
const cache = (): Record<string, Explorer> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }

/** Lichess masters explorer (free, anonymous, CORS *). One request at a time. */
export async function masters(fen: string): Promise<Explorer | null> {
  const c = cache()
  if (c[fen]) return c[fen]
  try {
    const r = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=8`)
    if (!r.ok) return null
    const j = (await r.json()) as Explorer
    const slim: Explorer = { moves: j.moves.map(m => ({ uci: m.uci, san: m.san, white: m.white, draws: m.draws, black: m.black })) }
    try { localStorage.setItem(KEY, JSON.stringify({ ...c, [fen]: slim })) } catch { /* full or private */ }
    return slim
  } catch {
    return null
  }
}
