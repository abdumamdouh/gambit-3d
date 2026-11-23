import { useGame } from '../game/store'
import { STAGES } from '../train/academy'
import { useAcademy, isUnlocked } from '../train/progress'
import { useTrain, startDrill, startPlacement, drillHint, exitTrain, nextLesson } from '../train/session'
import { usePuzzles, nextPuzzle } from '../train/puzzle-store'
import { THEMES } from '../train/puzzles'
import { useApp } from './app-store'

export function AcademyDialog({ onClose }: { onClose(): void }) {
  const { done, xp, placement } = useAcademy()
  const go = (fn: () => void) => { fn(); useApp.getState().set({ dialog: false }); onClose() }
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass academy" onClick={e => e.stopPropagation()}>
        <h2>🎓 Academy <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        <p className="mute">⭐ {xp} XP · {done.length} lessons done</p>
        {placement === null && (
          <div className="cta-row">
            <span>New here? A 5-question test opens the right stages for you.</span>
            <button className="primary" onClick={() => go(startPlacement)}>Take placement test</button>
          </div>
        )}
        <div className="stages">
          {STAGES.map(s => {
            const open = isUnlocked(s.id, done, placement)
            const n = s.lessons.filter(l => done.includes(l.id)).length
            return (
              <section key={s.id} className={open ? '' : 'locked'}>
                <header><span className="ico">{s.icon}</span><b>{s.id}. {s.title}</b><small>{open ? `${n}/${s.lessons.length}` : '🔒'}</small></header>
                <p className="small mute">{s.blurb}</p>
                <div className="lessons">
                  {s.lessons.map(l => (
                    <button key={l.id} disabled={!open} className={done.includes(l.id) ? 'done' : ''} onClick={() => go(() => startDrill(l, 'lesson'))}>
                      {done.includes(l.id) ? '✓ ' : ''}{l.title}
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TacticsDialog({ onClose }: { onClose(): void }) {
  const p = usePuzzles()
  const due = p.queue.filter(q => q.card.due <= Date.now()).length
  const go = (daily: boolean) => { useApp.getState().set({ dialog: false }); onClose(); void nextPuzzle(daily) }
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass wide" onClick={e => e.stopPropagation()}>
        <h2>⚔ Tactics trainer <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        <div className="tiles">
          <div className="stat"><small>Puzzle rating</small><b>{p.rating}</b></div>
          <div className="stat"><small>Solved</small><b>{p.solved}/{p.tried}</b></div>
          <div className="stat"><small>Streak</small><b>🔥 {p.streak.count}</b></div>
          <div className="stat"><small>To review</small><b>{due}</b></div>
        </div>
        <label>Theme</label>
        <div className="theme-chips">
          {THEMES.map(([id, name]) => <button key={id} className={p.theme === id ? 'on' : ''} onClick={() => p.set({ theme: id })}>{name}</button>)}
        </div>
        <p className="small mute">Real puzzles from Lichess games (free, CC0), picked near your rating. Missed puzzles come back after 1, 3 and 7 days.</p>
        <div className="row2">
          <button className="primary" onClick={() => go(false)}>Start puzzles</button>
          <button className="ghost" onClick={() => go(true)}>Daily puzzle</button>
        </div>
      </div>
    </div>
  )
}

export function TrainPanel() {
  const t = useTrain()
  const loading = usePuzzles(s => s.loading)
  const error = usePuzzles(s => s.error)
  const rating = usePuzzles(s => s.rating)
  const turn = useGame(s => s.fen.split(' ')[1])
  const player = useGame(s => s.playerColor)
  if (!t.drill) return null
  const d = t.drill
  const practice = d.goal === 'practice-mate' || d.goal === 'game'
  const next = t.kind === 'lesson' ? nextLesson() : null
  const finished = t.status === 'solved' || t.status === 'failed'
  const quit = () => { exitTrain(); useApp.getState().set({ dialog: true }) }
  return (
    <aside id="coach" className="glass train">
      <h3><i>{t.kind === 'puzzle' ? '⚔' : '🎓'}</i>{d.title}<button className="x" onClick={quit} aria-label="Exit">✕</button></h3>
      {t.kind === 'puzzle' && <p className="small mute">Your rating {rating}{d.rating ? ` · puzzle ${d.rating}` : ''}</p>}
      <p className="lesson-text">{d.text}</p>
      {!finished && !practice && <p className="small mute">{turn === player ? 'Your move.' : 'Watch the reply…'}</p>}
      {t.note && <p className={`note ${t.status}`}>{t.status === 'solved' ? '✅ ' : t.status === 'wrong' || t.status === 'failed' ? '✗ ' : '✓ '}{t.note}</p>}
      {t.status === 'solved' && !t.note && <p className="note solved">✅ Well done!</p>}
      {loading && <p className="small mute">Fetching a puzzle from Lichess…</p>}
      {error && <p className="small warn">{error}</p>}
      <div className="actions">
        {!finished && !practice && <button className="hint" onClick={drillHint}>💡 Hint</button>}
        <button onClick={() => startDrill(d, t.kind!, t.onEnd)} disabled={t.kind === 'placement'}>↺ Retry</button>
        {t.kind === 'placement' && t.placementIndex >= 5 && <button className="primary-sm" onClick={() => { exitTrain(); useApp.getState().set({ panel: 'academy' }) }}>🎓 Open Academy</button>}
        {t.kind === 'puzzle' && <button className="primary-sm" onClick={() => nextPuzzle()}>Next puzzle ›</button>}
        {t.kind === 'lesson' && next && finished && <button className="primary-sm" onClick={() => startDrill(next, 'lesson')}>Next lesson ›</button>}
      </div>
    </aside>
  )
}
