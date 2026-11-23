export interface UciMove { from: string; to: string; promotion?: string }
export interface UciInfo { depth: number; scoreCp?: number; mate?: number; pv: string[] }

export const uciToMove = (s: string): UciMove => (s.length > 4 ? { from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] } : { from: s.slice(0, 2), to: s.slice(2, 4) })

export function parseBestMove(line: string): UciMove | null {
  const m = /^bestmove (\S+)/.exec(line)
  return m && m[1] !== '(none)' ? uciToMove(m[1]) : null
}

export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith('info ')) return null
  const score = / score (cp|mate) (-?\d+)/.exec(line)
  if (!score) return null
  const depth = +(/ depth (\d+)/.exec(line)?.[1] ?? 0)
  const pv = / pv (.+)$/.exec(line)?.[1].trim().split(/\s+/) ?? []
  return score[1] === 'cp' ? { depth, scoreCp: +score[2], pv } : { depth, mate: +score[2], pv }
}
