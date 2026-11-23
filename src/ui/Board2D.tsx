import { useMemo } from 'react'
import { useGame, piecesAt } from '../game/store'
import { onSquareClick } from '../scene/input'
import { useCoach } from '../coach/coach-store'

const GLYPH: Record<string, string> = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' }

/** Flat board: fallback without WebGL, and the "2D" quality option. Same click rules as the 3D board. */
export function Board2D() {
  const live = useGame(s => s.pieces)
  const history = useGame(s => s.history)
  const viewPly = useGame(s => s.viewPly)
  const startFen = useGame(s => s.startFen)
  const selected = useGame(s => s.selected)
  const color = useGame(s => s.playerColor)
  const legalMoves = useGame(s => s.legalMoves)
  const fen = useGame(s => s.fen)
  const last = useGame(s => s.lastMove)
  const hint = useCoach(s => s.hint)
  const pieces = useMemo(() => (viewPly === null ? live : piecesAt(history, viewPly, startFen)), [live, history, viewPly, startFen])
  const targets = useMemo(() => new Set<string>(selected ? legalMoves(selected).map(m => m.to) : []), [selected, legalMoves, fen]) // eslint-disable-line react-hooks/exhaustive-deps
  const at = new Map(pieces.filter(p => !p.captured).map(p => [p.square, p]))
  const files = color === 'w' ? 'abcdefgh' : 'hgfedcba'
  const ranks = color === 'w' ? '87654321' : '12345678'
  return (
    <div id="board2d" role="grid" aria-label="Chess board">
      {[...ranks].map(r => [...files].map(f => {
        const sq = f + r
        const p = at.get(sq)
        const dark = (f.charCodeAt(0) - 97 + +r) % 2 === 1
        const cls = [dark ? 'l' : 'd', sq === selected && 'sel', targets.has(sq) && (p ? 'cap' : 'dot'), last && (sq === last.from || sq === last.to) && 'last', hint && (sq === hint.from || sq === hint.to) && 'hint'].filter(Boolean).join(' ')
        return (
          <button key={sq} className={cls} onClick={() => onSquareClick(sq)} aria-label={`${sq}${p ? ' ' + p.color + p.type : ''}`}>
            {p && <span className={p.color}>{GLYPH[p.color + p.type]}</span>}
            {f === files[0] && <i className="rk">{r}</i>}
            {r === ranks[7] && <i className="fl">{f}</i>}
          </button>
        )
      }))}
    </div>
  )
}
