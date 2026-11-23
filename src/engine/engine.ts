import { Chess } from 'chess.js'
import { goCommand, setupCommands, type Level } from './levels'
import { parseBestMove, type UciMove } from './uci'
import { fallbackMove } from './fallback'

const ENGINE_URL = '/engine/stockfish-17.1-lite-single-03e3232.js'

type Listener = (line: string) => void

/** Thin UCI wrapper. One search at a time; callers await. */
export class Engine {
  private worker: Worker | null = null
  private listeners = new Set<Listener>()
  private queue: Promise<unknown> = Promise.resolve()
  ready: Promise<boolean>

  constructor() {
    this.ready = new Promise(resolve => {
      try {
        this.worker = new Worker(ENGINE_URL)
        this.worker.onmessage = e => this.listeners.forEach(l => l(String(e.data)))
        this.worker.onerror = () => { this.worker = null; resolve(false) }
        const t = setTimeout(() => resolve(false), 15000)
        this.waitFor(l => l === 'uciok', 'uci')
          .then(() => this.waitFor(l => l === 'readyok', 'isready'))
          .then(() => { clearTimeout(t); resolve(true) })
      } catch { resolve(false) }
    })
  }

  get ok() { return this.worker !== null }

  private send(cmd: string) { this.worker?.postMessage(cmd) }

  private waitFor(match: (l: string) => boolean, cmd: string): Promise<string> {
    return new Promise(resolve => {
      const l: Listener = line => { if (match(line)) { this.listeners.delete(l); resolve(line) } }
      this.listeners.add(l)
      this.send(cmd)
    })
  }

  newGame() { this.send('ucinewgame') }

  bestMove(fen: string, level: Level): Promise<UciMove> {
    const run = async (): Promise<UciMove> => {
      const chess = new Chess(fen)
      if (level.randomness && Math.random() < level.randomness) return fallbackMove(chess, true)
      if (!(await this.ready) || !this.worker) return fallbackMove(chess)
      setupCommands(level).forEach(c => this.send(c))
      this.send(`position fen ${fen}`)
      const line = await this.waitFor(l => l.startsWith('bestmove'), goCommand(level))
      return parseBestMove(line) ?? fallbackMove(chess)
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }
}
