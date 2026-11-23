import { useEffect, useRef, useState } from 'react'
import { allGames, importGames } from '../progress/db'
import { ratingEstimate, verdict, type GameRecord, type Skills } from '../progress/skills'
import { gameAccuracy } from '../coach/eval'

// Validated with dataviz/validate_palette.js on #14161d (dark): all checks pass.
const NOW_C = '#b8852c'
const THEN_C = '#23998d'
const DAY = 864e5
const SKILLS: [keyof Skills, string][] = [['pieceSafety', 'Piece safety'], ['development', 'Development'], ['tactics', 'Tactics vision'], ['calculation', 'Calculation'], ['endgame', 'Endgame']]
const VERDICT = { improving: ['📈', 'Improving'], flat: ['➡️', 'Steady'], dropping: ['📉', 'Dropping'], 'not-enough': ['⏳', 'Play more'] } as const

function skillAvg(rs: GameRecord[], k: keyof Skills) {
  const xs = rs.map(r => r.skills[k]).filter((x): x is number => x !== null)
  return xs.length ? Math.round(gameAccuracy(xs)) : null
}

function AccuracyChart({ games }: { games: GameRecord[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 460, H = 160, P = { l: 30, r: 10, t: 10, b: 20 }
  const xs = games.slice(-30)
  if (xs.length < 2) return <p className="mute small">The chart appears after 2 reviewed games.</p>
  const x = (i: number) => P.l + (i / (xs.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b)
  const d = xs.map((g, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(g.accuracy).toFixed(1)}`).join('')
  const h = hover !== null ? xs[hover] : null
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Accuracy per game" onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={P.l - 6} y={y(v) + 4} className="axis" textAnchor="end">{v}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={NOW_C} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} className="cross" />}
        {xs.map((g, i) => (
          <g key={g.id}>
            <circle cx={x(i)} cy={y(g.accuracy)} r={4} fill={NOW_C} stroke="#14161d" strokeWidth={2} />
            <rect x={x(i) - 10} y={P.t} width={20} height={H - P.t - P.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      {h && (
        <div className="tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
          <b>{Math.round(h.accuracy)}%</b> accuracy<br />
          <span className="mute">{new Date(h.date).toLocaleDateString()} · {h.result} · level {h.level}</span>
        </div>
      )}
    </div>
  )
}

function SkillBars({ now, then }: { now: GameRecord[]; then: GameRecord[] }) {
  return (
    <div className="skills">
      <div className="legend">
        <span><i style={{ background: NOW_C }} />Last 5 games</span>
        {then.length > 0 && <span><i style={{ background: THEN_C }} />30+ days ago</span>}
      </div>
      {SKILLS.map(([k, name]) => {
        const a = skillAvg(now, k), b = then.length ? skillAvg(then, k) : null
        return (
          <div key={k} className="skill">
            <span className="name">{name}</span>
            <div className="bars">
              <div className="bar" title={`${name}: ${a ?? '—'} (last 5 games)`}><div style={{ width: `${a ?? 0}%`, background: NOW_C }} /><em>{a ?? '—'}</em></div>
              {then.length > 0 && <div className="bar" title={`${name}: ${b ?? '—'} (30+ days ago)`}><div style={{ width: `${b ?? 0}%`, background: THEN_C }} /><em>{b ?? '—'}</em></div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ProgressDialog({ onClose }: { onClose(): void }) {
  const [games, setGames] = useState<GameRecord[] | null>(null)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const load = () => allGames().then(g => setGames(g.sort((a, b) => a.date - b.date)))
  useEffect(() => { load() }, [])

  const now = Date.now()
  const all = games ?? []
  const recent = all.slice(-5)
  const old = all.filter(g => g.date < now - 30 * DAY).slice(-5)
  const v = verdict(all, now)
  const rating = ratingEstimate(all)
  const last10 = all.slice(-10)

  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 1)], { type: 'application/json' }))
    a.download = `gambit3d-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importJson = async (f: File) => {
    try { setMsg(`Imported ${await importGames(await f.text())} games.`); load() } catch { setMsg('That file is not a Gambit 3D export.') }
  }

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass progress-dlg" onClick={e => e.stopPropagation()}>
        <h2>Your progress <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        {!games ? <p className="mute">Loading…</p> : !all.length ? (
          <p className="mute">No games yet. Finish a game: Gambit 3D reviews it and saves a Skill Report here.</p>
        ) : (
          <>
            <div className="tiles">
              <div className="stat"><small>Games</small><b>{all.length}</b></div>
              <div className="stat"><small>Accuracy (last 10)</small><b>{Math.round(gameAccuracy(last10.map(g => g.accuracy)))}%</b></div>
              <div className="stat"><small>Est. rating</small><b>{rating ?? '—'}</b></div>
              <div className="stat"><small>This week</small><b>{VERDICT[v][0]} {VERDICT[v][1]}</b></div>
            </div>
            <h4>Accuracy per game</h4>
            <AccuracyChart games={all} />
            <h4>Skills (0–100)</h4>
            <SkillBars now={recent} then={old} />
            <h4>Recent games</h4>
            <table className="games">
              <thead><tr><th>Date</th><th>Result</th><th>Level</th><th>Accuracy</th><th>Blunders</th></tr></thead>
              <tbody>
                {[...all].reverse().slice(0, 8).map(g => (
                  <tr key={g.id}><td>{new Date(g.date).toLocaleDateString()}</td><td className={g.result}>{g.result}</td><td>{g.level}</td><td>{Math.round(g.accuracy)}%</td><td>{g.counts.blunder}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="row2">
          <button className="ghost" onClick={exportJson} disabled={!all.length}>Export</button>
          <button className="ghost" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        {msg && <p className="small mute">{msg}</p>}
      </div>
    </div>
  )
}
