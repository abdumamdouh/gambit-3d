import { Engine } from './engine'
import { useApp } from '../ui/app-store'

/** The one Stockfish worker for play and analysis (requests are queued). */
export const engine = new Engine()
engine.ready.then(ok => useApp.getState().set({ engine: ok ? 'ready' : 'fallback' }))
