import { Chess } from 'chess.js'
import { useGame } from '../game/store'

export function exportPgn() {
  const g = useGame.getState()
  const c = new Chess(g.startFen)
  g.history.forEach(h => c.move(h.san))
  c.setHeader('Event', 'Gambit 3D')
  c.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'))
  c.setHeader(g.playerColor === 'w' ? 'White' : 'Black', 'You')
  c.setHeader(g.playerColor === 'w' ? 'Black' : 'White', g.mode === 'game' ? `Stockfish level ${g.level}` : 'Opponent')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([c.pgn()], { type: 'application/x-chess-pgn' }))
  a.download = `gambit3d-${Date.now()}.pgn`
  a.click()
}
