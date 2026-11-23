import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { useCoach } from '../coach/coach-store'
import { useReview, closeReview } from '../coach/review-store'
import { explain } from '../coach/review'
import { qwenExplain } from '../coach/qwen'
import { fmtScore, winPct } from '../coach/eval'
import type { Label } from '../coach/eval'

export const LABEL_UI: Record<Label, { name: string; icon: string; cls: string }> = {
  best: { name: 'Best', icon: '★', cls: 'l-best' },
  good: { name: 'Good', icon: '✓', cls: 'l-good' },
  inaccuracy: { name: 'Inaccuracy', icon: '?!', cls: 'l-inacc' },
  mistake: { name: 'Mistake', icon: '?', cls: 'l-mistake' },
  blunder: { name: 'Blunder', icon: '??', cls: 'l-blunder' },
}

/** Vertical bar; the player's colour fills from the bottom. */
export function EvalBar() {
  const score = useCoach(s => s.score)
  const color = useGame(s => s.playerColor)
  const viewPly = useGame(s => s.viewPly)
  const plies = useReview(s => s.plies)
  const shown = viewPly !== null && plies[viewPly - 1] ? plies[viewPly - 1].after : score
  const w = shown ? winPct(shown) : 50
  const mine = color === 'w' ? w : 100 - w
  return (
    <div id="evalbar" title="Evaluation (who is better)" className={color === 'b' ? 'black' : ''}>
      <div className="fill" style={{ height: `${Math.max(3, Math.min(97, mine))}%` }} />
      <span>{shown ? fmtScore(shown) : '0.0'}</span>
    </div>
  )
}

export function GuardModal() {
  const guard = useCoach(s => s.guard)
  const set = useCoach(s => s.set)
  if (!guard) return null
  return (
    <div className="modal-wrap">
      <div className="modal glass">
        <h2>⚠ Are you sure?</h2>
        <p><b>{guard.san}</b> drops your winning chances by about <b>{guard.lossPct}%</b>.</p>
        {guard.bestSan && <p className="mute">Look again. There is a better move. (Stockfish likes {guard.bestSan}.)</p>}
        <div className="row2">
          <button className="primary" onClick={() => set({ guard: null })}>Try again</button>
          <button className="ghost" onClick={() => { set({ guard: null }); useGame.getState().tryMove(guard.from, guard.to) }}>Play anyway</button>
        </div>
      </div>
    </div>
  )
}

export function Toggles() {
  const { guardOn, aiCoach, toggle } = useCoach()
  return (
    <div className="toggles">
      <label><input type="checkbox" checked={guardOn} onChange={() => toggle('guardOn')} /> Blunder guard</label>
      <label title="Uses LM Studio on this computer (localhost:1234) with Qwen. Free and private."><input type="checkbox" checked={aiCoach} onChange={() => toggle('aiCoach')} /> Local AI coach</label>
    </div>
  )
}

export function ReviewPanel() {
  const r = useReview()
  const g = useGame()
  const aiCoach = useCoach(s => s.aiCoach)
  const [ai, setAi] = useState<Record<number, string | null>>({})
  const cur = r.plies[r.index]
  const go = (i: number) => {
    const n = Math.max(0, Math.min(r.plies.length - 1, i))
    r.set({ index: n })
    g.setViewPly(n + 1)
  }

  useEffect(() => {
    if (!aiCoach || !cur || cur.label === 'best' || cur.label === 'good' || cur.ply in ai) return
    setAi(a => ({ ...a, [cur.ply]: null }))
    qwenExplain(cur, r.pv[r.index] ?? []).then(t => setAi(a => ({ ...a, [cur.ply]: t ?? '' })))
  }, [aiCoach, cur, r.index, r.pv, ai])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(r.index - 1); if (e.key === 'ArrowRight') go(r.index + 1) }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  })

  if (r.status === 'running') {
    return (
      <aside id="coach" className="glass">
        <h3><i>♛</i>Game review</h3>
        <p className="mute">Stockfish is checking every move…</p>
        <div className="progress"><div style={{ width: `${Math.round(r.progress * 100)}%` }} /></div>
        <p className="small mute">{Math.round(r.progress * 100)}%</p>
      </aside>
    )
  }

  const me = r.plies.filter(p => p.color === g.playerColor)
  const opp = r.plies.filter(p => p.color !== g.playerColor)
  const acc = (xs: typeof me) => (xs.length ? Math.round(xs.reduce((s, p) => s + p.accuracy, 0) / xs.length) : 0)
  const aiText = cur ? ai[cur.ply] : undefined
  return (
    <aside id="coach" className="glass review">
      <h3><i>♛</i>Game review <button className="x" onClick={closeReview} aria-label="Close review">✕</button></h3>
      <div id="stats">
        <div className="stat"><small>Your accuracy</small><b>{acc(me)}%</b></div>
        <div className="stat"><small>Stockfish</small><b>{acc(opp)}%</b></div>
      </div>
      <div className="chips">
        {(['best', 'good', 'inaccuracy', 'mistake', 'blunder'] as Label[]).map(l => (
          <span key={l} className={`chip ${LABEL_UI[l].cls}`}>{LABEL_UI[l].icon} {me.filter(p => p.label === l).length} {LABEL_UI[l].name}</span>
        ))}
      </div>
      {cur && (
        <div className="explain">
          <div className="head">
            <span className={`chip ${LABEL_UI[cur.label].cls}`}>{LABEL_UI[cur.label].icon} {LABEL_UI[cur.label].name}</span>
            <b>{Math.ceil(cur.ply / 2)}{cur.color === 'w' ? '.' : '…'} {cur.san}</b>
            <span className="mute small">{cur.color === g.playerColor ? 'you' : 'Stockfish'}</span>
          </div>
          {aiCoach && aiText ? <p><span className="badge">AI coach</span> {aiText}</p> : <p dangerouslySetInnerHTML={{ __html: explain(cur) }} />}
          {aiCoach && aiText === null && <p className="small mute">Asking local Qwen…</p>}
          {cur.label !== 'best' && cur.bestSan && <p className="small mute">The teal arrow shows the better move.</p>}
        </div>
      )}
      <div id="moves" className="labeled">
        {r.plies.map((p, i) => (
          <button key={p.ply} className={`mv ${i === r.index ? 'on' : ''} ${LABEL_UI[p.label].cls}`} onClick={() => go(i)}>
            {p.color === 'w' && <span className="n">{Math.ceil(p.ply / 2)}.</span>}{p.san}<i>{p.label === 'good' ? '' : LABEL_UI[p.label].icon}</i>
          </button>
        ))}
      </div>
      <div className="actions">
        <button onClick={() => go(0)} aria-label="First move">⏮</button>
        <button onClick={() => go(r.index - 1)} aria-label="Previous move">‹ Prev</button>
        <button onClick={() => go(r.index + 1)} aria-label="Next move">Next ›</button>
        <button onClick={() => go(r.plies.length - 1)} aria-label="Last move">⏭</button>
      </div>
      {r.record && <p className="small mute saved">✓ Saved to your progress.</p>}
    </aside>
  )
}
