// Demo mode (?demo=1): a scripted showcase for screen-recorded videos (Dolly clicks #demo-N buttons).
// Normal play never loads any of this.
import { Chess } from 'chess.js'
import { useGame } from '../game/store'
import { useApp } from '../ui/app-store'
import { useView } from '../scene/view'
import { useTheme } from '../scene/themes'
import { useCoach } from '../coach/coach-store'
import { showHint } from '../coach/actions'
import { runReview, closeReview } from '../coach/review-store'
import { onSquareClick } from '../scene/input'
import { exitTrain } from '../train/session'
import { nextPuzzle } from '../train/puzzle-store'
import { allGames, saveGame } from '../progress/db'
import type { GameRecord, Mistake } from '../progress/skills'

export const isDemo = () => new URLSearchParams(location.search).has('demo')

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const g = () => useGame.getState()

/** Player move the way a person makes it: select, pause, click the target. */
async function click(from: string, to: string) {
  const n = g().history.length
  onSquareClick(from)
  await wait(550)
  onSquareClick(to)
  // Wait for the move (the blunder guard checks it first), or for the guard to stop it.
  for (let i = 0; i < 60 && g().history.length === n && !useCoach.getState().guard; i++) await wait(100)
  await wait(500)
}
/** Opponent move (scripted, so every take of the video is identical). */
async function reply(from: string, to: string) {
  await wait(500)
  g().move({ from, to })
  await wait(700)
}

const BLACKBURNE = '[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1'
const FOOL = '[Result "0-1"]\n\n1. a3 e5 2. f3 Nc6 3. g4 Qh4# 0-1'

/** Three sample games so My Coach has a story to tell. */
async function seed() {
  if ((await allGames()).length) return
  const fenAt = (pgn: string, ply: number) => { const c = new Chess(); c.loadPgn(pgn); const h = c.history({ verbose: true }); return h[ply - 1].before }
  const m = (pgn: string, ply: number, san: string, best: string, bestSan: string, label: Mistake['label'], tags: Mistake['tags'], phase: Mistake['phase'], loss: number): Mistake =>
    ({ fen: fenAt(pgn, ply), san, best, bestSan, label, tags, phase, loss, ply })
  const base = (id: string, daysAgo: number, pgn: string, opening: string, mistakes: Mistake[], acc: number): GameRecord => ({
    id, date: Date.now() - daysAgo * 864e5, color: 'w', level: 3, result: 'loss', reason: 'checkmate', accuracy: acc, plies: 7,
    counts: { best: 1, good: 2, inaccuracy: 0, mistake: mistakes.filter(x => x.label === 'mistake').length, blunder: mistakes.filter(x => x.label === 'blunder').length },
    phases: { opening: acc, middlegame: null, endgame: null },
    skills: { pieceSafety: 50, development: 30, tactics: 0, endgame: null, calculation: 52 },
    pgn, mistakes, opening, castlePly: null, earlyQueen: false,
  })
  const bb = [m(BLACKBURNE, 7, 'Nxe5', 'f3d4', 'Nxd4', 'blunder', ['hangs'], 'opening', 0.31), m(BLACKBURNE, 9, 'Nxf7', 'd2d4', 'd4', 'blunder', ['allowsMate'], 'opening', 0.42)]
  const fm = [m(FOOL, 5, 'g4', 'e2e4', 'e4', 'blunder', ['allowsMate'], 'opening', 0.6)]
  await saveGame(base('demo-1', 6, BLACKBURNE, 'e4 e5 Nf3 Nc6', bb, 48))
  await saveGame(base('demo-2', 3, FOOL, 'a3 e5 f3 Nc6', fm, 41))
  await saveGame(base('demo-3', 1, BLACKBURNE, 'e4 e5 Nf3 Nc6', bb.map(x => ({ ...x })), 52))
}

export async function initDemo() {
  useApp.getState().set({ demo: true, dialog: false })
  useTheme.getState().setTheme('obsidian')
  useCoach.setState({ guardOn: true, aiCoach: false })
  g().newGame({ color: 'w', level: 3, minutes: null })
  await seed()
}

let busy = false
const once = (fn: () => Promise<void>) => async () => { if (busy) return; busy = true; try { await fn() } finally { busy = false } }

export const STEPS: Record<number, () => Promise<void>> = {
  // 1 Hook: cinematic orbit around the board.
  1: once(async () => { useView.getState().setCam('orbit') }),
  // 2 Play: a clean Italian opening, pieces arcing across the board.
  2: once(async () => {
    useView.getState().setCam('player'); await wait(1500)
    await click('e2', 'e4'); await reply('e7', 'e5')
    await click('g1', 'f3'); await reply('b8', 'c6')
    await click('f1', 'c4'); await reply('g8', 'f6')
  }),
  // 3 Blunder guard: try Nxe5?? and get stopped.
  3: once(async () => {
    await click('f3', 'e5')
    await wait(3200)
    useCoach.getState().set({ guard: null })
  }),
  // 4 Hint arrow, then castle.
  4: once(async () => {
    await showHint(); await wait(2600)
    await click('e1', 'g1'); await reply('f8', 'c5')
  }),
  // 5 Review a lost game: labels, explanation, better-move arrow.
  5: once(async () => {
    g().loadPgn(BLACKBURNE)
    useGame.setState({ playerColor: 'w' })
    await runReview({ save: false })
  }),
  // 6 My Coach: style analysis across games → train my own mistakes.
  6: once(async () => {
    closeReview()
    useApp.getState().set({ panel: 'mycoach' }); await wait(4200)
    ;(document.querySelector('.mycoach .primary') as HTMLButtonElement | null)?.click()
  }),
  // 7 Montage: Academy, a live Lichess puzzle, four styles.
  7: once(async () => {
    exitTrain()
    useApp.getState().set({ panel: 'academy' }); await wait(1800)
    useApp.getState().set({ panel: null }); void nextPuzzle(); await wait(2300)
    exitTrain(); g().newGame({ color: 'w', level: 3, minutes: null }); useView.getState().setCam('low')
    for (const t of ['walnut', 'crystal', 'neon', 'obsidian'] as const) { useTheme.getState().setTheme(t); await wait(1250) }
  }),
  // 8 Close-up: slow cinematic orbit.
  8: once(async () => { useView.getState().setCam('orbit') }),
  // 9 End card.
  9: once(async () => { useApp.getState().set({ panel: null, endCard: true }) }),
}
