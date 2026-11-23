import { Chess } from 'chess.js'

/** UCI move or line → SAN, stopping at the first illegal move. */
export function uciLineToSan(fen: string, uci: string[]): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  for (const u of uci) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san) } catch { break }
  }
  return out
}

export const fenAfter = (fen: string, m: { from: string; to: string; promotion?: string }) => {
  const c = new Chess(fen)
  return c.move(m).after
}
