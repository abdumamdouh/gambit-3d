import { useGame } from '../game/store'

/** One click rule for squares and pieces: move to a target, else (re)select an own piece. */
export function onSquareClick(sq: string) {
  const s = useGame.getState()
  if (s.result.over || s.pendingPromotion || s.turn() !== s.playerColor) return
  if (s.selected && s.selected !== sq && s.legalMoves(s.selected).some(m => m.to === sq)) {
    s.tryMove(s.selected, sq)
    return
  }
  const p = s.pieces.find(x => !x.captured && x.square === sq)
  s.select(p && p.color === s.playerColor && s.selected !== sq ? sq : null)
}
