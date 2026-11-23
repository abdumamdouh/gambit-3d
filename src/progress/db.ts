import type { GameRecord } from './skills'

// ponytail: 30-line IndexedDB wrapper, one store; swap for a lib only if queries grow.
const open = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('gambit3d', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('games', { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    const req = fn(db.transaction('games', mode).objectStore('games'))
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export const saveGame = (g: GameRecord) => tx('readwrite', s => s.put(g)).catch(() => undefined)
export const allGames = () => tx<GameRecord[]>('readonly', s => s.getAll()).catch(() => [] as GameRecord[])

/** A row is usable only if every field the dashboards read is present (review #12). */
export function isRecord(r: unknown): r is GameRecord {
  const x = r as Record<string, unknown> | null
  const obj = (v: unknown) => !!v && typeof v === 'object'
  return !!x && typeof x.id === 'string' && typeof x.date === 'number' && typeof x.accuracy === 'number' && obj(x.skills) && obj(x.counts) && obj(x.phases)
}

/** Import keeps only rows that look like game records. */
export async function importGames(json: string) {
  const rows = JSON.parse(json)
  if (!Array.isArray(rows)) throw new Error('Not a Gambit 3D export')
  const ok = rows.filter(isRecord)
  for (const r of ok) await saveGame(r)
  return ok.length
}
