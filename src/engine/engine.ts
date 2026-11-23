import { Chess } from 'chess.js'
import { goCommand, setupCommands, type Level } from './levels'
import { finalScore, parseBestMove, parseInfo, type UciInfo, type UciMove } from './uci'
import type { Score } from '../coach/eval'
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
        this.worker.onerror = () => {
          this.worker = null
          resolve(false)
          // Release anyone waiting on a search, so the queue cannot hang (review #9).
          this.listeners.forEach(l => l('bestmove (none)'))
        }
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
    return this.enqueue(run)
  }

  /** Full-strength analysis. Score is from White's view. */
  analyse(fen: string, depth: number): Promise<{ score: Score; bestMove: UciMove | null; pv: string[] } | null> {
    const run = async () => {
      if (!(await this.ready) || !this.worker) return null
      let last: UciInfo | null = null
      const grab: Listener = l => { const i = parseInfo(l); if (i && !l.includes(' multipv 2')) last = i }
      this.listeners.add(grab)
      setupCommands({ id: 0, label: '', skill: 20 }).forEach(c => this.send(c))
      this.send(`position fen ${fen}`)
      const line = await this.waitFor(l => l.startsWith('bestmove'), `go depth ${depth}`)
      this.listeners.delete(grab)
      const info = last as UciInfo | null
      return { score: finalScore(fen, info), bestMove: parseBestMove(line), pv: info?.pv ?? [] }
    }
    return this.enqueue(run)
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }
}
