export type Color = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export interface Piece { id: string; type: PieceType; color: Color; square: string; captured: boolean }
export interface MoveLike { from: string; to: string; flags: string; promotion?: string }

const BACK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
const FILES = 'abcdefgh'

export function initialPieces(): Piece[] {
  const out: Piece[] = []
  for (const color of ['w', 'b'] as Color[]) {
    const back = color === 'w' ? '1' : '8', pawn = color === 'w' ? '2' : '7'
    for (let i = 0; i < 8; i++) {
      out.push({ id: `${color}${BACK[i]}${i}`, type: BACK[i], color, square: FILES[i] + back, captured: false })
      out.push({ id: `${color}p${i}`, type: 'p', color, square: FILES[i] + pawn, captured: false })
    }
  }
  return out
}

/** Returns a new list; ids stay stable so the scene can animate. */
export function applyMove(pieces: Piece[], m: MoveLike): Piece[] {
  const capSq = m.flags.includes('e') ? m.to[0] + m.from[1] : m.to
  const isCapture = m.flags.includes('c') || m.flags.includes('e')
  const rank = m.from[1]
  const rook = m.flags.includes('k') ? ['h' + rank, 'f' + rank] : m.flags.includes('q') ? ['a' + rank, 'd' + rank] : null
  return pieces.map(p => {
    if (p.captured) return p
    if (isCapture && p.square === capSq && p.square !== m.from) return { ...p, captured: true }
    if (p.square === m.from) return { ...p, square: m.to, type: (m.promotion as PieceType) ?? p.type }
    if (rook && p.square === rook[0]) return { ...p, square: rook[1] }
    return p
  })
}
