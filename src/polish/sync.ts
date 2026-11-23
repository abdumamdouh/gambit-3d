import Peer, { type DataConnection } from 'peerjs'
import { create } from 'zustand'
import { allGames, isRecord, saveGame } from '../progress/db'
import type { GameRecord } from '../progress/skills'

export interface Snapshot {
  v: 1
  games: GameRecord[]
  academy: { done: string[]; xp: number; placement: number | null }
  puzzles: { rating: number; theme: string; solved: number; tried: number; streak: { last: string | null; count: number }; queue: { drill: unknown; card: { box: number; due: number } }[] }
  fixed: string[]
}

const read = <T,>(k: string, d: T): T => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) ?? 'null') } } catch { return d } }
const EMPTY_P: Snapshot['puzzles'] = { rating: 1000, theme: 'mix', solved: 0, tried: 0, streak: { last: null, count: 0 }, queue: [] }

export async function collect(): Promise<Snapshot> {
  let fixed: string[] = []
  try { fixed = JSON.parse(localStorage.getItem('g3d.fixed') ?? '[]') } catch { /* empty */ }
  return { v: 1, games: await allGames(), academy: read('g3d.academy', { done: [], xp: 0, placement: null }), puzzles: read('g3d.puzzles', EMPTY_P), fixed }
}

/** Peer data is untrusted: keep only well-formed parts. */
export function parseSnapshot(x: unknown): Snapshot | null {
  const s = x as Partial<Snapshot> | null
  if (!s || s.v !== 1 || !Array.isArray(s.games) || !s.academy || !s.puzzles || !Array.isArray(s.fixed)) return null
  const a = s.academy, p = s.puzzles
  return {
    v: 1,
    games: s.games.filter(isRecord),
    academy: { done: Array.isArray(a.done) ? a.done.filter(d => typeof d === 'string') : [], xp: Number(a.xp) || 0, placement: typeof a.placement === 'number' ? a.placement : null },
    puzzles: { ...EMPTY_P, ...p, rating: Number(p.rating) || 1000, solved: Number(p.solved) || 0, tried: Number(p.tried) || 0, queue: Array.isArray(p.queue) ? p.queue : [] },
    fixed: s.fixed.filter(f => typeof f === 'string'),
  }
}

/** Both devices end with everything: unions for lists, the more-used device for ratings. */
export function mergeSnapshots(a: Snapshot, b: Snapshot): Snapshot {
  const games = [...new Map([...a.games, ...b.games].map(g => [g.id, g])).values()]
  const pa = a.puzzles, pb = b.puzzles
  const main = pb.tried > pa.tried ? pb : pa
  const latest = (pb.streak.last ?? '') > (pa.streak.last ?? '') ? pb.streak : pa.streak
  const queue = [...new Map([...pa.queue, ...pb.queue].map(q => [(q.drill as { id: string }).id, q])).values()]
  const placements = [a.academy.placement, b.academy.placement].filter((x): x is number => x !== null)
  return {
    v: 1,
    games,
    academy: { done: [...new Set([...a.academy.done, ...b.academy.done])], xp: Math.max(a.academy.xp, b.academy.xp), placement: placements.length ? Math.max(...placements) : null },
    puzzles: { ...main, solved: Math.max(pa.solved, pb.solved), tried: Math.max(pa.tried, pb.tried), streak: latest, queue },
    fixed: [...new Set([...a.fixed, ...b.fixed])],
  }
}

async function apply(s: Snapshot) {
  for (const g of s.games) await saveGame(g)
  localStorage.setItem('g3d.academy', JSON.stringify(s.academy))
  localStorage.setItem('g3d.puzzles', JSON.stringify(s.puzzles))
  localStorage.setItem('g3d.fixed', JSON.stringify(s.fixed))
}

type Status = 'idle' | 'waiting' | 'connecting' | 'done' | 'error'
export const useSync = create<{ status: Status; link: string; message: string }>(() => ({ status: 'idle', link: '', message: '' }))

let peer: Peer | null = null
function exchange(c: DataConnection) {
  c.on('open', async () => c.send(await collect()))
  c.on('data', async raw => {
    const theirs = parseSnapshot(raw)
    if (!theirs) { useSync.setState({ status: 'error', message: 'The other device sent data I could not read.' }); return }
    const merged = mergeSnapshots(await collect(), theirs)
    await apply(merged)
    useSync.setState({ status: 'done', message: `Synced: ${merged.games.length} games, ${merged.academy.done.length} lessons, puzzle rating ${merged.puzzles.rating}. Reloading…` })
    setTimeout(() => { peer?.destroy(); location.reload() }, 2500)
  })
}

/** Device A: create a one-time link. */
export function hostSync() {
  peer?.destroy()
  peer = new Peer()
  useSync.setState({ status: 'connecting', message: 'Creating a sync link…', link: '' })
  peer.on('open', id => useSync.setState({ status: 'waiting', link: `${location.origin}/?sync=${id}`, message: 'Open this link on your other device (same app). Keep this screen open.' }))
  peer.on('connection', c => exchange(c))
  peer.on('error', e => useSync.setState({ status: 'error', message: `Sync error: ${e.type}` }))
}

/** Device B: opened the link. */
export function joinSync(id: string) {
  peer?.destroy()
  peer = new Peer()
  useSync.setState({ status: 'connecting', message: 'Connecting to your other device…' })
  peer.on('open', () => exchange(peer!.connect(id, { reliable: true })))
  peer.on('error', e => useSync.setState({ status: 'error', message: e.type === 'peer-unavailable' ? 'This sync link has expired. Create a new one.' : `Sync error: ${e.type}` }))
}
