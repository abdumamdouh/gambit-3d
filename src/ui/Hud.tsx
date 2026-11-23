import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/store'
import { playerMove } from '../train/route'
import type { Color, PieceType } from '../game/pieces'
import { LEVELS } from '../engine/levels'
import { useView, type CamPreset } from '../scene/view'
import { useApp } from './app-store'
import { useCoach } from '../coach/coach-store'
import { showHint } from '../coach/actions'
import { useReview, runReview } from '../coach/review-store'
import { EvalBar, GuardModal, ReviewPanel, Toggles } from './CoachUi'
import { ProgressDialog } from './ProgressDialog'
import { ThemePicker } from './ThemePicker'
import { AcademyDialog, TacticsDialog, TrainPanel } from './TrainUi'
import { OnlineDialog } from './OnlineUi'
import { MyCoachDialog } from './MyCoach'
import { exportPgn } from '../polish/pgn'
import { useSettings } from '../polish/settings'
import { useInstall, install } from '../polish/install'
import { useOnline, resignOnline, leaveOnline } from '../online/session'
import { useTrain, exitTrain } from '../train/session'

const NAMES: Record<PieceType, string> = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }
const TIPS: Record<PieceType, string> = {
  p: 'moves 1 step forward (2 on its first move) and captures diagonally.',
  n: 'jumps in an L shape. It is the only piece that can jump over others.',
  b: 'slides diagonally, any distance. It stays on one colour all game.',
  r: 'slides in straight lines. Rooks love open files.',
  q: 'moves like a rook and a bishop together. Do not bring her out too early.',
  k: 'moves one square. Keep him safe — castle early.',
}
const VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const REASON: Record<string, string> = {
  checkmate: 'by checkmate', stalemate: 'Stalemate — the side to move has no legal move.', insufficient: 'Not enough material to mate.',
  threefold: 'Same position three times.', fifty: '50 moves without a capture or pawn move.', timeout: 'on time', resign: 'by resignation', other: '(from the saved game)',
}

const fmt = (ms: number) => {
  if (!isFinite(ms)) return '∞'
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function useCoachText(): string {
  const { selected, pieces, history, result, playerColor } = useGame()
  const thinking = useApp(s => s.thinking)
  const hint = useCoach(s => s.hint)
  const checking = useCoach(s => s.checking)
  const legalMoves = useGame(s => s.legalMoves)
  if (result.over) return ''
  if (useGame.getState().mode === 'online') return thinking ? '' : 'Online game: the coach stays quiet for fair play. Review the game when it ends.'
  if (selected) {
    const p = pieces.find(x => !x.captured && x.square === selected)
    if (p) {
      const n = legalMoves(selected).length
      return `<b>${NAMES[p.type]}</b> ${TIPS[p.type]} It has <b>${n}</b> legal move${n === 1 ? '' : 's'} now.`
    }
  }
  if (checking) return 'Coach is checking…'
  if (hint) return `💡 Hint: try <b>${hint.san}</b>. Follow the teal arrow, then ask why it works.`
  if (thinking) return 'Stockfish is thinking…'
  const last = history[history.length - 1]
  if (!last) return `You play <b>${playerColor === 'w' ? 'White' : 'Black'}</b>. Click a piece to see how it moves.`
  if (last.color !== playerColor) {
    if (last.san.includes('+')) return '<span class="warn">You are in check.</span> Move the king, block, or capture the attacker.'
    if (last.captured) return `<span class="warn">⚠ Stockfish took your ${NAMES[last.captured as PieceType]}.</span> Before each move, ask: <b>is anything of mine undefended?</b>`
    return `Stockfish played <b>${last.san}</b>. Your move.`
  }
  if (last.captured) return `Nice — you took a <b>${NAMES[last.captured as PieceType]}</b> (+${VAL[last.captured as PieceType]}).`
  return `<b>${last.san}</b> played.`
}

export function Hud() {
  const g = useGame()
  const app = useApp()
  const cam = useView(s => s.cam)
  const setCam = useView(s => s.setCam)
  const zoomBy = useView(s => s.zoomBy)
  const reviewOpen = useReview(s => s.open)
  const reviewGameId = useReview(s => s.gameId)
  const panel = useApp(s => s.panel)
  const setPanel = (p: typeof panel) => useApp.getState().set({ panel: p })
  const training = useTrain(s => s.kind !== null)
  const online = useOnline()
  const isOnline = g.mode === 'online'
  const flat = useSettings(s => s.quality) === 'flat'
  const canInstall = useInstall(s => !!s.evt)
  const coach = useCoachText()
  const movesRef = useRef<HTMLDivElement>(null)
  const opp: Color = g.playerColor === 'w' ? 'b' : 'w'
  const level = LEVELS[g.level - 1]
  const material = g.pieces.filter(p => p.captured).reduce((s, p) => s + (p.color === g.playerColor ? -1 : 1) * VAL[p.type], 0)

  useEffect(() => { movesRef.current?.scrollTo({ top: 1e9 }) }, [g.history.length])

  const rows: [number, string, string][] = []
  for (let i = 0; i < g.history.length; i += 2) rows.push([i / 2 + 1, g.history[i].san, g.history[i + 1]?.san ?? ''])

  return (
    <>
      <div id="brand" className="glass"><b>GAMBIT <span>3D</span></b><small>learn · play · improve</small></div>
      <div id="tools">
        <button onClick={() => setPanel('academy')} title="Academy">🎓<span> Academy</span></button>
        <button onClick={() => setPanel('tactics')} title="Tactics trainer">⚔<span> Tactics</span></button>
        <button onClick={() => setPanel('mycoach')} title="My Coach: your style and personal lessons">🧠<span> My Coach</span></button>
        <button onClick={() => setPanel('online')} title="Play online">🌐<span> Online</span></button>
        <button onClick={() => setPanel('progress')} title="Your progress">📈<span> Progress</span></button>
        {canInstall && <button onClick={install} title="Install Gambit 3D as an app">⬇<span> Install</span></button>}
        <button onClick={() => setPanel('style')} title="Board style">🎨<span> Style</span></button>
      </div>
      <EvalBar />

      <div id="opp" className="glass">
        <span className={`dot ${app.engine}`} title={`Engine: ${app.engine}`} />
        <span>{g.mode === 'drill' ? 'Training' : g.mode === 'online' ? `${online.opponent || 'Online'}${online.status === 'ended' ? ' · left' : ''}` : `Stockfish · ${level.label}`}</span>
        <span className={`clock ${g.turn() === opp && !g.result.over ? 'on' : ''}`}>{fmt(g.clock[opp])}</span>
      </div>

      <div id="me" className="glass">
        <span>You</span>
        <span className={`clock ${g.turn() === g.playerColor && !g.result.over ? 'on' : ''}`}>{fmt(g.clock[g.playerColor])}</span>
      </div>

      {training ? <TrainPanel /> : reviewOpen ? <ReviewPanel key={reviewGameId} /> : <aside id="coach" className="glass">
        <h3><i>♛</i>Coach</h3>
        <div id="msg" dangerouslySetInnerHTML={{ __html: coach || '&nbsp;' }} />
        <div id="moves" ref={movesRef}>
          {rows.map(([n, w, b]) => (
            <div key={n} className="row"><span className="n">{n}.</span><span>{w}</span><span>{b}</span></div>
          ))}
        </div>
        <div id="stats">
          <div className="stat"><small>Material</small><b>{material > 0 ? '+' : ''}{material}</b></div>
          <div className="stat"><small>Moves</small><b>{Math.ceil(g.history.length / 2)}</b></div>
        </div>
        <div className="actions">
          <button onClick={() => app.set({ dialog: true })}>New game</button>
          <button onClick={() => g.undo()} disabled={!g.history.length || app.thinking || isOnline || g.result.over}>↶ Undo</button>
          <button onClick={() => (isOnline ? resignOnline() : g.resign())} disabled={g.result.over || !g.history.length}>Resign</button>
        </div>
        <div className="actions">
          <button className="hint" onClick={() => showHint()} disabled={g.result.over || app.thinking || g.turn() !== g.playerColor || isOnline}>💡 Hint</button>
          <button onClick={() => runReview()} disabled={!g.result.over}>🔍 Review</button>
          <button onClick={exportPgn} disabled={!g.history.length} title="Download this game as PGN">⤓ PGN</button>
        </div>
        <Toggles />
      </aside>}

      {!flat && <nav id="cams" className="glass">
        {(['player', 'top', 'low', 'orbit'] as CamPreset[]).map(c => (
          <button key={c} className={cam === c ? 'on' : ''} onClick={() => setCam(c)}>
            {{ player: 'Player', top: 'Top', low: 'Low angle', orbit: 'Cinematic' }[c]}
          </button>
        ))}
        <span className="sep" />
        <button onClick={() => zoomBy(0.8)} aria-label="Zoom in" title="Zoom in">＋</button>
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom out" title="Zoom out">－</button>
      </nav>}

      {app.engine === 'fallback' && <div id="banner-warn" className="glass">Engine could not load. Playing a simple bot instead.</div>}

      {g.pendingPromotion && <PromotionPicker color={g.playerColor} />}
      {g.result.over && !app.dialog && !reviewOpen && !training && <ResultCard />}
      {app.dialog && <NewGameDialog />}
      <GuardModal />
      {panel === 'progress' && <ProgressDialog onClose={() => setPanel(null)} />}
      {panel === 'style' && <ThemePicker onClose={() => setPanel(null)} />}
      {panel === 'academy' && <AcademyDialog onClose={() => setPanel(null)} />}
      {panel === 'tactics' && <TacticsDialog onClose={() => setPanel(null)} />}
      {panel === 'online' && <OnlineDialog onClose={() => setPanel(null)} />}
      {panel === 'mycoach' && <MyCoachDialog onClose={() => setPanel(null)} />}
    </>
  )
}

function PromotionPicker({ color }: { color: Color }) {
  const g = useGame()
  const icons: Record<string, string> = color === 'w' ? { q: '♕', r: '♖', b: '♗', n: '♘' } : { q: '♛', r: '♜', b: '♝', n: '♞' }
  return (
    <div className="modal-wrap">
      <div className="modal glass">
        <h2>Promote your pawn</h2>
        <div className="promo">
          {(['q', 'r', 'b', 'n'] as const).map(p => (
            <button key={p} onClick={() => { const pp = g.pendingPromotion!; useGame.setState({ pendingPromotion: null }); playerMove(pp.from, pp.to, p) }} title={NAMES[p]}>{icons[p]}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultCard() {
  const { result, playerColor } = useGame()
  const set = useApp(s => s.set)
  const win = result.winner === playerColor
  const title = result.winner == null ? 'Draw' : win ? 'You win! 🏆' : 'Stockfish wins'
  const why = result.winner == null ? REASON[result.reason!] : `${win ? 'You won' : 'Stockfish won'} ${REASON[result.reason!]}.`
  return (
    <div className="modal-wrap">
      <div className="modal glass">
        <h2>{title}</h2>
        <p className="mute">{why}</p>
        <div className="row2">
          <button className="primary" onClick={() => runReview()}>🔍 Review game</button>
          <button className="ghost" onClick={() => set({ dialog: true })}>New game</button>
        </div>
      </div>
    </div>
  )
}

function NewGameDialog() {
  const g = useGame()
  const set = useApp(s => s.set)
  const [color, setColor] = useState<Color | 'r'>(g.playerColor)
  const [level, setLevel] = useState(g.level)
  const [minutes, setMinutes] = useState<number | null>(g.minutes)
  const start = () => {
    const c: Color = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    exitTrain()
    leaveOnline()
    g.newGame({ color: c, level, minutes })
    set({ dialog: false })
    useView.getState().setCam('player')
  }
  return (
    <div className="modal-wrap">
      <div className="modal glass wide">
        <h2>New game</h2>
        <label>Play as</label>
        <div className="seg">
          {([['w', 'White'], ['r', 'Random'], ['b', 'Black']] as const).map(([v, t]) => (
            <button key={v} className={color === v ? 'on' : ''} onClick={() => setColor(v)}>{t}</button>
          ))}
        </div>
        <label>Opponent strength</label>
        <div className="levels">
          {LEVELS.map(l => (
            <button key={l.id} className={level === l.id ? 'on' : ''} onClick={() => setLevel(l.id)}>
              <b>{l.id}</b><small>{l.label.split(' · ')[1]}</small>
            </button>
          ))}
        </div>
        <p className="mute small">{LEVELS[level - 1].label}</p>
        <label>Time per side</label>
        <div className="seg">
          {[null, 5, 10, 15].map(m => (
            <button key={String(m)} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>{m ? `${m} min` : 'No clock'}</button>
          ))}
        </div>
        <button className="primary" onClick={start}>Play</button>
      </div>
    </div>
  )
}
