import { create } from 'zustand'
import Peer, { type DataConnection } from 'peerjs'
import { Chess } from 'chess.js'
import { useGame } from '../game/store'
import type { Color } from '../game/pieces'
import * as li from './lichess'

const START = new Chess().fen()

type Status = 'idle' | 'hosting' | 'connecting' | 'seeking' | 'playing' | 'ended' | 'error'
interface OnlineState {
  kind: 'friend' | 'lichess' | null
  status: Status
  link: string
  opponent: string
  message: string
  user: string | null
  set(p: Partial<OnlineState>): void
}
export const useOnline = create<OnlineState>(set => ({ kind: null, status: 'idle', link: '', opponent: '', message: '', user: null, set }))

type Msg = { t: 'start'; hostColor: Color } | { t: 'move'; uci: string; ply: number } | { t: 'resign' }

let peer: Peer | null = null
let conn: DataConnection | null = null
let lichessGame: string | null = null
let abort: AbortController | null = null

const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '')
const localUci = () => useGame.getState().history.map(uciOf)

export function leaveOnline() {
  conn?.close(); peer?.destroy(); abort?.abort()
  conn = null; peer = null; abort = null; lichessGame = null
  useOnline.setState({ kind: null, status: 'idle', link: '', opponent: '', message: '' })
}

// ---------------- friend (peer-to-peer) ----------------

function wire(c: DataConnection) {
  conn = c
  c.on('data', raw => {
    const m = raw as Msg
    const g = useGame.getState()
    if (m.t === 'start') {
      g.loadFen(START, 'online', m.hostColor === 'w' ? 'b' : 'w')
      useOnline.setState({ status: 'playing', opponent: 'Friend', message: '' })
    } else if (m.t === 'move') {
      if (m.ply !== g.history.length) return // duplicate or out of order
      const ok = g.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] || undefined })
      if (!ok) useOnline.setState({ status: 'error', message: 'Your friend sent an illegal move. Game stopped.' })
    } else if (m.t === 'resign') {
      useGame.setState({ result: { over: true, reason: 'resign', winner: g.playerColor } })
    }
  })
  c.on('close', () => { if (useOnline.getState().status === 'playing') useOnline.setState({ status: 'ended', message: 'Your friend left the game.' }) })
}

export function hostFriendGame(hostColor: Color = 'w') {
  leaveOnline()
  useOnline.setState({ kind: 'friend', status: 'connecting', message: 'Creating your invite link…' })
  peer = new Peer()
  peer.on('open', id => useOnline.setState({ status: 'hosting', link: `${location.origin}/?join=${id}`, message: 'Send this link to your friend. The game starts when they open it.' }))
  peer.on('error', e => useOnline.setState({ status: 'error', message: `Connection error: ${e.type}` }))
  peer.on('connection', c => {
    wire(c)
    c.on('open', () => {
      c.send({ t: 'start', hostColor } satisfies Msg)
      useGame.getState().loadFen(START, 'online', hostColor)
      useOnline.setState({ status: 'playing', opponent: 'Friend', message: '' })
    })
  })
}

export function joinFriendGame(hostId: string) {
  leaveOnline()
  useOnline.setState({ kind: 'friend', status: 'connecting', message: 'Joining your friend…' })
  peer = new Peer()
  peer.on('open', () => wire(peer!.connect(hostId, { reliable: true })))
  peer.on('error', e => useOnline.setState({ status: 'error', message: e.type === 'peer-unavailable' ? 'This invite link is no longer active.' : `Connection error: ${e.type}` }))
}

// ---------------- Lichess ----------------

export async function initLichess() {
  await li.completeLogin()
  if (!li.token()) return
  const a = await li.account()
  useOnline.setState({ user: a?.username ?? null })
}

export async function seekLichess(minutes: number, increment: number) {
  leaveOnline()
  abort = new AbortController()
  const signal = abort.signal
  useOnline.setState({ kind: 'lichess', status: 'seeking', message: `Looking for a ${minutes}+${increment} opponent on Lichess…` })
  // The event stream tells us when the seek is paired.
  li.stream('/api/stream/event', o => {
    const e = o as { type: string; game?: { gameId: string } }
    if (e.type === 'gameStart' && e.game && !lichessGame) void playLichess(e.game.gameId, signal)
  }, signal).catch(() => undefined)
  li.seek(minutes, increment, signal).catch(() => undefined)
}

async function playLichess(id: string, signal: AbortSignal) {
  lichessGame = id
  const me = useOnline.getState().user?.toLowerCase()
  const apply = (moves: string, wtime?: number, btime?: number, status?: string, winner?: Color) => {
    const g = useGame.getState()
    const todo = li.movesToApply(localUci(), moves)
    if (todo === null) { // resync from scratch
      g.loadFen(START, 'online', g.playerColor)
      for (const u of moves.split(' ').filter(Boolean)) useGame.getState().move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined })
    } else for (const u of todo) useGame.getState().move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined })
    if (wtime !== undefined && btime !== undefined) useGame.setState({ clock: { w: wtime, b: btime } })
    if (status && !['created', 'started'].includes(status) && !useGame.getState().result.over) {
      useGame.setState({ result: { over: true, reason: status === 'mate' ? 'checkmate' : status === 'resign' ? 'resign' : status === 'outoftime' ? 'timeout' : 'stalemate', winner: winner ?? null } })
    }
  }
  await li.stream(`/api/board/game/stream/${id}`, o => {
    const e = o as { type: string; white?: { id?: string; name?: string }; black?: { id?: string; name?: string }; state?: { moves: string; wtime: number; btime: number; status: string; winner?: Color }; moves?: string; wtime?: number; btime?: number; status?: string; winner?: Color }
    if (e.type === 'gameFull') {
      const color: Color = e.white?.id === me ? 'w' : 'b'
      useGame.getState().loadFen(START, 'online', color)
      const opp = color === 'w' ? e.black : e.white
      useOnline.setState({ status: 'playing', opponent: opp?.name ?? 'Lichess player', message: '' })
      apply(e.state!.moves, e.state!.wtime, e.state!.btime, e.state!.status, e.state!.winner)
    } else if (e.type === 'gameState') {
      apply(e.moves ?? '', e.wtime, e.btime, e.status, e.winner)
    }
  }, signal).catch(() => undefined)
  if (useOnline.getState().status === 'playing') useOnline.setState({ status: 'ended' })
}

// ---------------- shared ----------------

/** Player move in an online game (both kinds). */
export function onlineMove(from: string, to: string, promotion?: string) {
  const g = useGame.getState()
  if (useOnline.getState().status !== 'playing' || g.turn() !== g.playerColor) return
  if (!promotion && g.legalMoves(from).some(m => m.to === to && m.promotion)) { g.tryMove(from, to); return }
  const ply = g.history.length
  const mv = g.move({ from, to, promotion })
  if (!mv) return
  const uci = uciOf(mv)
  if (conn) conn.send({ t: 'move', uci, ply } satisfies Msg)
  if (lichessGame) li.sendMove(lichessGame, uci).then(r => { if (!r.ok) useOnline.setState({ message: 'Lichess rejected the move. Resyncing…' }) })
}

export function resignOnline() {
  const g = useGame.getState()
  if (conn) conn.send({ t: 'resign' } satisfies Msg)
  if (lichessGame) void li.resignGame(lichessGame)
  g.resign()
}
