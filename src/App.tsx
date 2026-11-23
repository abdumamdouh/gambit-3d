import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'
import { useGame } from './game/store'
import { useApp } from './ui/app-store'
import { LEVELS } from './engine/levels'

import { engine } from './engine/instance'
import { refreshEval } from './coach/actions'
import { useCoach } from './coach/coach-store'
import { useReview, runReview } from './coach/review-store'
import './scene/themes'
import { initSound } from './polish/sound'
import { initVoice } from './polish/voice'

initSound()
initVoice()
import { useTrain, checkTrainResult } from './train/session'
import { useOnline, joinFriendGame, initLichess } from './online/session'

/** Engine plays whenever it is not the player's turn. Stale replies are dropped. */
function useEngineTurn() {
  const fen = useGame(s => s.fen)
  const gameId = useGame(s => s.gameId)
  const over = useGame(s => s.result.over)
  const dialog = useApp(s => s.dialog)

  useEffect(() => { engine.newGame() }, [gameId])

  useEffect(() => {
    const s = useGame.getState()
    if (over || dialog || s.fromHistory || s.turn() === s.playerColor || (s.mode !== 'game' && s.mode !== 'practice')) return
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

/** Eval bar after every move; clear the hint; review the game when it ends. */
function useCoachLoop() {
  const fen = useGame(s => s.fen)
  const gameId = useGame(s => s.gameId)
  const over = useGame(s => s.result.over)
  useEffect(() => { useCoach.getState().set({ hint: null, guard: null }) }, [fen])
  useEffect(() => { useCoach.getState().set({ score: null, hintsUsed: 0 }); if (useReview.getState().gameId !== gameId) useReview.getState().set({ open: false, status: 'idle', gameId: -1 }) }, [gameId])
  useEffect(() => { if (!useApp.getState().dialog && useGame.getState().mode !== 'online') void refreshEval(fen) }, [fen])
  useEffect(() => { const s = useGame.getState(); if (over && s.mode === 'game' && !useTrain.getState().kind && s.history.length >= 6) void runReview() }, [over])
  useEffect(() => { checkTrainResult() }, [fen, over])
}

function useClock() {
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      if (!useApp.getState().dialog && useGame.getState().mode === 'game') useGame.getState().tick(now - last)
      last = now
    }, 100)
    return () => clearInterval(id)
  }, [])
}

/** Lichess OAuth return and ?join= invite links. */
function useOnlineEntry() {
  useEffect(() => {
    const join = new URLSearchParams(location.search).get('join')
    if (join) { history.replaceState(null, '', '/'); useApp.getState().set({ dialog: false, panel: 'online' }); joinFriendGame(join) }
    void initLichess().then(() => { if (useOnline.getState().user && !join) useApp.getState().set({ panel: 'online' }) })
  }, [])
  const status = useOnline(s => s.status)
  useEffect(() => { if (status === 'playing') useApp.getState().set({ panel: null, dialog: false }) }, [status])
}

export default function App() {
  useEngineTurn()
  useCoachLoop()
  useOnlineEntry()
  useClock()
  return (
    <>
      <Scene />
      <Hud />
    </>
  )
}
