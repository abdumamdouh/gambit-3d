import type { Chess } from 'chess.js'

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Used when the engine is missing, and for the random part of level 1. */
export function fallbackMove(chess: Chess, randomOnly = false) {
  const moves = chess.moves({ verbose: true })
  const caps = moves.filter(m => m.captured).sort((a, b) => VAL[b.captured!] - VAL[a.captured!])
  const m = !randomOnly && caps.length ? caps[0] : moves[Math.floor(Math.random() * moves.length)]
  return { from: m.from, to: m.to, promotion: m.promotion }
}
