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

/** Import keeps only rows that look like game records. */
export async function importGames(json: string) {
  const rows = JSON.parse(json)
  if (!Array.isArray(rows)) throw new Error('Not a Gambit 3D export')
  const ok = rows.filter((r): r is GameRecord => r && typeof r.id === 'string' && typeof r.date === 'number' && typeof r.accuracy === 'number' && r.skills)
  for (const r of ok) await saveGame(r)
  return ok.length
}
