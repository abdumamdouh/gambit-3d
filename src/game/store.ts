import { create } from 'zustand'
import { Chess, type Move } from 'chess.js'
import { applyMove, initialPieces, type Color, type Piece } from './pieces'
import { gameResult, type Result } from './result'

// ponytail: one module-level Chess instance; the store exposes snapshots only.
let chess = new Chess()

export interface NewGameOptions { color: Color; level: number; minutes: number | null }

export interface GameState {
  fen: string
  history: Move[]
  pieces: Piece[]
  result: Result
  playerColor: Color
  level: number
  minutes: number | null
  clock: { w: number; b: number }
  selected: string | null
  lastMove: { from: string; to: string } | null
  pendingPromotion: { from: string; to: string } | null
  gameId: number
  /** Review mode: show the position after this many plies (null = live). */
  viewPly: number | null
  setViewPly(p: number | null): void
  newGame(o: NewGameOptions): void
  loadFen(fen: string): void
  legalMoves(square: string): Move[]
  select(square: string | null): void
  tryMove(from: string, to: string): boolean
  move(m: { from: string; to: string; promotion?: string }): Move | null
  undo(): void
  tick(ms: number): void
  resign(): void
  turn(): Color
}

const snapshot = (pieces: Piece[]) => {
  const history = chess.history({ verbose: true })
  const last = history[history.length - 1]
  return {
    fen: chess.fen(),
    history,
    pieces,
    result: gameResult(chess),
    selected: null,
    pendingPromotion: null,
    lastMove: last ? { from: last.from, to: last.to } : null,
    viewPly: null,
  }
}

export const useGame = create<GameState>((set, get) => ({
  fen: chess.fen(),
  history: [],
  pieces: initialPieces(),
  result: { over: false },
  playerColor: 'w',
  level: 3,
  minutes: 10,
  clock: { w: 600000, b: 600000 },
  selected: null,
  lastMove: null,
  pendingPromotion: null,
  gameId: 0,
  viewPly: null,
  setViewPly: p => set({ viewPly: p, selected: null }),

  newGame({ color, level, minutes }) {
    chess = new Chess()
    const ms = minutes ? minutes * 60000 : Infinity
    set({ ...snapshot(initialPieces()), playerColor: color, level, minutes, clock: { w: ms, b: ms }, gameId: get().gameId + 1 })
  },

  // For tests and future lessons/puzzles. Pieces get fresh ids.
  loadFen(fen) {
    chess = new Chess(fen)
    const pieces: Piece[] = chess.board().flat().filter(Boolean).map((c, i) => ({ id: `f${i}`, type: c!.type, color: c!.color, square: c!.square, captured: false }))
    set({ ...snapshot(pieces), gameId: get().gameId + 1 })
  },

  legalMoves: square => (get().result.over ? [] : chess.moves({ square: square as never, verbose: true })),

  select: square => set({ selected: square }),

  tryMove(from, to) {
    const legal = get().legalMoves(from).filter(m => m.to === to)
    if (!legal.length) return false
    if (legal.some(m => m.promotion)) { set({ pendingPromotion: { from, to }, selected: null }); return true }
    return get().move({ from, to }) !== null
  },

  move(m) {
    if (get().result.over) return null
    let mv: Move
    try { mv = chess.move(m) } catch { return null }
    set(snapshot(applyMove(get().pieces, mv)))
    return mv
  },

  undo() {
    const { history, playerColor } = get()
    if (!history.length) return
    // Go back to the player's turn: 2 plies if the engine already replied, else 1.
    let n = history.length - 1
    if (n > 0 && history[n].color !== playerColor) n -= 1
    if (history[n]?.color !== playerColor) n += 1
    const keep = history.slice(0, Math.max(0, n))
    chess = new Chess()
    let pieces = initialPieces()
    for (const h of keep) pieces = applyMove(pieces, chess.move(h.san))
    set(snapshot(pieces))
  },

  tick(ms) {
    const { history, result, clock } = get()
    if (result.over || !history.length) return
    const side = chess.turn()
    const left = clock[side] - ms
    if (left <= 0) set({ clock: { ...clock, [side]: 0 }, result: { over: true, reason: 'timeout', winner: side === 'w' ? 'b' : 'w' } })
    else set({ clock: { ...clock, [side]: left } })
  },

  resign() {
    if (get().result.over) return
    const p = get().playerColor
    set({ result: { over: true, reason: 'resign', winner: p === 'w' ? 'b' : 'w' }, selected: null })
  },

  turn: () => chess.turn(),
}))

/** Pieces after the first `ply` moves, replayed from the start so ids match the live game. */
export function piecesAt(history: Move[], ply: number): Piece[] {
  const c = new Chess()
  let p = initialPieces()
  for (const h of history.slice(0, ply)) p = applyMove(p, c.move(h.san))
  return p
}
