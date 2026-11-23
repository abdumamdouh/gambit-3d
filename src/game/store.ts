import { create } from 'zustand'
import { Chess, type Move } from 'chess.js'
import { applyMove, initialPieces, type Color, type Piece } from './pieces'
import { gameResult, type Result } from './result'

// ponytail: one module-level Chess instance; the store exposes snapshots only.
const START = new Chess().fen()
let chess = new Chess()

export type Mode = 'game' | 'drill' | 'practice' | 'online'

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
  /** game = vs engine; drill = scripted lesson/puzzle; practice = goal vs engine; online = remote opponent. */
  mode: Mode
  startFen: string
  /** True for games loaded from PGN/history: they are reviewed but never saved again. */
  fromHistory: boolean
  /** Review mode: show the position after this many plies (null = live). */
  viewPly: number | null
  setViewPly(p: number | null): void
  newGame(o: NewGameOptions): void
  loadFen(fen: string, mode?: Mode, playerColor?: Color): void
  /** Load a whole game (for review). Throws on invalid PGN. */
  loadPgn(pgn: string): void
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
  mode: 'game',
  startFen: START,
  fromHistory: false,
  viewPly: null,
  setViewPly: p => set({ viewPly: p, selected: null }),

  newGame({ color, level, minutes }) {
    chess = new Chess()
    const ms = minutes ? minutes * 60000 : Infinity
    set({ ...snapshot(initialPieces()), playerColor: color, level, minutes, clock: { w: ms, b: ms }, gameId: get().gameId + 1, mode: 'game', startFen: START, fromHistory: false })
  },

  // Lessons, puzzles, practice and online games start here. Pieces get fresh ids.
  loadFen(fen, mode = 'drill', playerColor) {
    chess = new Chess(fen)
    set({ ...snapshot(fenPieces(fen)), gameId: get().gameId + 1, mode, startFen: fen, fromHistory: false, playerColor: playerColor ?? chess.turn(), clock: { w: Infinity, b: Infinity }, minutes: null })
  },

  loadPgn(pgn) {
    const c = new Chess()
    c.loadPgn(pgn)
    const sans = c.history()
    const start = c.getHeaders().FEN ?? START
    chess = new Chess(start)
    let pieces = fenPieces(start)
    for (const san of sans) pieces = applyMove(pieces, chess.move(san))
    const snap = snapshot(pieces)
    // Board result first; otherwise trust the PGN Result header (resign, timeout, agreed draw) — review #4.
    const tag = c.getHeaders().Result
    const result = snap.result.over ? snap.result : tag === '1-0' ? { over: true, reason: 'other' as const, winner: 'w' as const } : tag === '0-1' ? { over: true, reason: 'other' as const, winner: 'b' as const } : tag === '1/2-1/2' ? { over: true, reason: 'other' as const, winner: null } : snap.result
    set({ ...snap, result, gameId: get().gameId + 1, mode: 'game', startFen: start, fromHistory: true, playerColor: 'w', clock: { w: Infinity, b: Infinity }, minutes: null })
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
    const { history, playerColor, result } = get()
    // A finished game stays finished; it is already reviewed and saved (review #3).
    if (!history.length || result.over) return
    // Go back to the player's turn: 2 plies if the engine already replied, else 1.
    let n = history.length - 1
    if (n > 0 && history[n].color !== playerColor) n -= 1
    if (history[n]?.color !== playerColor) n += 1
    const keep = history.slice(0, Math.max(0, n))
    const start = get().startFen
    chess = new Chess(start)
    let pieces = fenPieces(start)
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
export function piecesAt(history: Move[], ply: number, startFen = START): Piece[] {
  const c = new Chess(startFen)
  let p = fenPieces(startFen)
  for (const h of history.slice(0, ply)) p = applyMove(p, c.move(h.san))
  return p
}

/** Pieces for any position. The standard start keeps the standard ids. */
export function fenPieces(fen: string): Piece[] {
  if (fen === START) return initialPieces()
  return new Chess(fen).board().flat().filter(Boolean).map((c, i) => ({ id: `f${i}`, type: c!.type, color: c!.color, square: c!.square, captured: false }))
}
