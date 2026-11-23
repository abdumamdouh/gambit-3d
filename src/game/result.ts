import type { Chess } from 'chess.js'
import type { Color } from './pieces'

export type Reason = 'checkmate' | 'stalemate' | 'threefold' | 'insufficient' | 'fifty' | 'timeout' | 'resign'
export interface Result { over: boolean; reason?: Reason; winner?: Color | null }

export function gameResult(chess: Chess): Result {
  if (chess.isCheckmate()) return { over: true, reason: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' }
  if (chess.isStalemate()) return { over: true, reason: 'stalemate', winner: null }
  if (chess.isInsufficientMaterial()) return { over: true, reason: 'insufficient', winner: null }
  if (chess.isThreefoldRepetition()) return { over: true, reason: 'threefold', winner: null }
  if (chess.isDraw()) return { over: true, reason: 'fifty', winner: null }
  return { over: false }
}
