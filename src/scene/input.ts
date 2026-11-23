import { useGame } from '../game/store'
import { guardedMove } from '../coach/actions'
import { useCoach } from '../coach/coach-store'

/** One click rule for squares and pieces: move to a target, else (re)select an own piece. */
export function onSquareClick(sq: string) {
  const s = useGame.getState()
  if (s.result.over || s.pendingPromotion || s.viewPly !== null || s.turn() !== s.playerColor || useCoach.getState().checking) return
  if (s.selected && s.selected !== sq && s.legalMoves(s.selected).some(m => m.to === sq)) {
    void guardedMove(s.selected, sq)
    return
  }
  const p = s.pieces.find(x => !x.captured && x.square === sq)
  s.select(p && p.color === s.playerColor && s.selected !== sq ? sq : null)
}
