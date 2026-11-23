import { Chess, type Move } from 'chess.js'
import type { UciMove } from '../engine/uci'
import { classify, lossFor, moveAccuracy, moverPct, type Label, type Score } from './eval'
import { uciLineToSan } from './san'

export type Tag = 'allowsMate' | 'missedMate' | 'hangs' | 'missedWin' | 'positional'
export interface Analysis { score: Score; bestMove?: UciMove | null; pv: string[] }

export interface PlyReview {
  ply: number
  san: string
  color: 'w' | 'b'
  from: string
  to: string
  before: Score
  after: Score
  best: UciMove | null
  bestSan: string | null
  /** Opponent's best line after the played move, in SAN. */
  pvSan: string[]
  loss: number
  label: Label
  accuracy: number
  tags: Tag[]
  mateIn?: number
  captured?: string
}

const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const uciStr = (m: UciMove) => m.from + m.to + (m.promotion ?? '')

export function reviewPly(fenBefore: string, move: Move, a: Analysis, b: Analysis, ply: number): PlyReview {
  const color = move.color
  const best = a.bestMove ?? null
  const isBest = !!best && best.from === move.from && best.to === move.to && (best.promotion ?? undefined) === (move.promotion ?? undefined)
  const loss = isBest ? 0 : lossFor(color, a.score, b.score)
  const bestSan = best ? uciLineToSan(fenBefore, [uciStr(best)])[0] ?? null : null
  const pvSan = uciLineToSan(move.after, b.pv.slice(0, 3))
  const mine = (s: Score) => (s.mate !== undefined ? (color === 'w' ? s.mate > 0 : s.mate < 0) : false)
  const theirs = (s: Score) => (s.mate !== undefined ? !mine(s) : false)

  const tags: Tag[] = []
  let mateIn: number | undefined
  let captured: string | undefined
  if (!isBest) {
    if (theirs(b.score) && !theirs(a.score)) { tags.push('allowsMate'); mateIn = Math.abs(b.score.mate!) }
    if (mine(a.score) && !mine(b.score)) { tags.push('missedMate'); mateIn = Math.abs(a.score.mate!) }
    if (loss >= 0.1 && b.pv[0]) {
      const reply = new Chess(move.after).moves({ verbose: true }).find(m => m.from + m.to === b.pv[0].slice(0, 4))
      if (reply?.captured) { tags.push('hangs'); captured = `${NAMES[reply.captured]} on ${reply.to}` }
    }
    if (loss >= 0.1 && best) {
      const bm = new Chess(fenBefore).moves({ verbose: true }).find(m => m.from === best.from && m.to === best.to)
      if (bm?.captured) tags.push('missedWin')
    }
    if (!tags.length && loss >= 0.05) tags.push('positional')
  }

  return {
    ply, san: move.san, color, from: move.from, to: move.to, before: a.score, after: b.score, best, bestSan, pvSan, loss,
    label: classify(loss, isBest), accuracy: moveAccuracy(moverPct(color, a.score), moverPct(color, b.score)), tags, mateIn, captured,
  }
}

/** Plain-words explanation built only from engine facts. */
export function explain(p: PlyReview): string {
  const best = p.bestSan ? `<b>${p.bestSan}</b>` : 'another move'
  const reply = p.pvSan[0] ? `<b>${p.pvSan[0]}</b>` : 'the reply'
  if (p.tags.includes('allowsMate')) return `This allows mate in ${p.mateIn}: ${reply}${p.pvSan.length > 1 ? ' and ' + p.pvSan.slice(1).join(' ') : ''}. Look for checks against your king before you move. Better was ${best}.`
  if (p.tags.includes('missedMate')) return `You had mate in ${p.mateIn}! ${best} finishes the game. Always check every check first.`
  if (p.tags.includes('hangs')) return `This leaves your ${p.captured} undefended: ${reply} takes it. Before each move, ask what your opponent can capture. Better was ${best}.`
  if (p.tags.includes('missedWin')) return `You missed ${best}, which wins material. Look at every capture before you choose a move.`
  if (p.tags.includes('positional')) return `${p.san} is playable, but ${best} keeps a better position.`
  if (p.label === 'best') return `${p.san} is the engine's top move. Well played.`
  return `${p.san} is a solid move.`
}
