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
  /** The search running now; background evals may be cut short when something urgent is queued. */
  private running: { interruptible: boolean } | null = null
  ready: Promise<boolean>
  /** True once Stockfish answered readyok — even if that came after the start timeout. */
  isReady = false
  /** Called when the engine status changes (late start included). */
  onStatus: (ok: boolean) => void = () => {}

  constructor() {
    this.ready = new Promise(resolve => {
      try {
        this.worker = new Worker(ENGINE_URL)
        this.worker.onmessage = e => this.listeners.forEach(l => l(String(e.data)))
        this.worker.onerror = () => {
          this.worker = null
          this.isReady = false
          resolve(false)
          this.onStatus(false)
          // Release anyone waiting on a search, so the queue cannot hang (review #9).
          this.listeners.forEach(l => l('bestmove (none)'))
        }
        // Slow device: after 15 s play the fallback bot, but keep waiting — a late start still upgrades to Stockfish.
        const t = setTimeout(() => { resolve(false); this.onStatus(false) }, 15000)
        this.waitFor(l => l === 'uciok', 'uci')
          .then(() => this.waitFor(l => l === 'readyok', 'isready'))
          .then(() => { clearTimeout(t); this.isReady = true; resolve(true); this.onStatus(true) })
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
      await this.ready
      if (!this.isReady || !this.worker) return fallbackMove(chess)
      setupCommands(level).forEach(c => this.send(c))
      this.send(`position fen ${fen}`)
      const line = await this.waitFor(l => l.startsWith('bestmove'), goCommand(level))
      return parseBestMove(line) ?? fallbackMove(chess)
    }
    return this.enqueue(run)
  }

  /** Full-strength analysis. Score is from White's view. */
  analyse(fen: string, depth: number, interruptible = false): Promise<{ score: Score; bestMove: UciMove | null; pv: string[]; depth: number } | null> {
    const run = async () => {
      await this.ready
      if (!this.isReady || !this.worker) return null
      let last: UciInfo | null = null
      const grab: Listener = l => { const i = parseInfo(l); if (i && !l.includes(' multipv 2')) last = i }
      this.listeners.add(grab)
      setupCommands({ id: 0, label: '', skill: 20 }).forEach(c => this.send(c))
      this.send(`position fen ${fen}`)
      const line = await this.waitFor(l => l.startsWith('bestmove'), `go depth ${depth}`)
      this.listeners.delete(grab)
      const info = last as UciInfo | null
      return { score: finalScore(fen, info), bestMove: parseBestMove(line), pv: info?.pv ?? [], depth: info?.depth ?? depth }
    }
    return this.enqueue(run, interruptible)
  }

  private enqueue<T>(run: () => Promise<T>, interruptible = false): Promise<T> {
    // An urgent request (move, hint, guard, review) stops a background eval: Stockfish answers bestmove at once.
    if (!interruptible && this.running?.interruptible) this.send('stop')
    const job = async () => { this.running = { interruptible }; try { return await run() } finally { this.running = null } }
    const p = this.queue.then(job, job)
    this.queue = p.catch(() => undefined)
    return p
  }
}
