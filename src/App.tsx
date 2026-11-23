import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'
import { useGame } from './game/store'
import { useApp } from './ui/app-store'
import { Engine } from './engine/engine'
import { LEVELS } from './engine/levels'

const engine = new Engine()
engine.ready.then(ok => useApp.getState().set({ engine: ok ? 'ready' : 'fallback' }))

/** Engine plays whenever it is not the player's turn. Stale replies are dropped. */
function useEngineTurn() {
  const fen = useGame(s => s.fen)
  const gameId = useGame(s => s.gameId)
  const over = useGame(s => s.result.over)
  const dialog = useApp(s => s.dialog)

  useEffect(() => { engine.newGame() }, [gameId])

  useEffect(() => {
    const s = useGame.getState()
    if (over || dialog || s.turn() === s.playerColor) return
    let live = true
    useApp.getState().set({ thinking: true })
    const started = performance.now()
    engine.bestMove(fen, LEVELS[s.level - 1]).then(async mv => {
      const wait = 450 - (performance.now() - started) // ponytail: tiny pause so instant replies still feel like a move
      if (wait > 0) await new Promise(r => setTimeout(r, wait))
      const now = useGame.getState()
      if (live && now.fen === fen && now.gameId === gameId) now.move(mv)
      if (live) useApp.getState().set({ thinking: false })
    })
    return () => { live = false; useApp.getState().set({ thinking: false }) }
  }, [fen, gameId, over, dialog])
}

function useClock() {
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      if (!useApp.getState().dialog) useGame.getState().tick(now - last)
      last = now
    }, 100)
    return () => clearInterval(id)
  }, [])
}

export default function App() {
  useEngineTurn()
  useClock()
  return (
    <>
      <Scene />
      <Hud />
    </>
  )
}
