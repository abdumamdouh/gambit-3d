import { useEffect, useMemo, useState } from 'react'
import { allGames } from '../progress/db'
import type { GameRecord } from '../progress/skills'
import { analyzeStyle, type Weakness } from '../coach/style'
import { generatePlan } from '../coach/lessons-gen'
import { qwenLetter, templateLetter } from '../coach/letter'
import { useCoach } from '../coach/coach-store'
import { fixedSet, startPersonal } from '../train/personal'
import { startDrill } from '../train/session'
import { allLessons } from '../train/academy'
import { usePuzzles, nextPuzzle } from '../train/puzzle-store'
import { useApp } from './app-store'
import { ownPositions, judge, masters, toDrill, type Verdict } from '../coach/repertoire'

const TREND = { better: '📈 improving', worse: '📉 getting worse', same: '➡️ no change' } as const

export function MyCoachDialog({ onClose }: { onClose(): void }) {
  const [games, setGames] = useState<GameRecord[] | null>(null)
  const [ai, setAi] = useState<{ text: string | null; busy: boolean; failed: boolean }>({ text: null, busy: false, failed: false })
  const aiCoach = useCoach(s => s.aiCoach)
  const [rep, setRep] = useState<{ busy: boolean; done: number; list: Verdict[]; failed: boolean } | null>(null)
  useEffect(() => { allGames().then(setGames) }, [])
  const profile = useMemo(() => analyzeStyle(games ?? []), [games])
  const plan = useMemo(() => generatePlan(profile, fixedSet()), [profile])
  const lessons = allLessons()
  const go = (fn: () => void) => { useApp.getState().set({ dialog: false }); onClose(); fn() }
  const drillsFor = (w: Weakness) => generatePlan({ ...profile, weaknesses: [w] }, fixedSet()).drills
  const checkOpenings = async () => {
    const pos = ownPositions(games ?? []).slice(0, 10)
    setRep({ busy: true, done: 0, list: [], failed: false })
    const list: Verdict[] = []
    let failed = false
    for (let i = 0; i < pos.length; i++) {
      const ex = await masters(pos[i].fen)
      if (!ex) failed = true
      const v = ex && judge(pos[i], ex)
      if (v) list.push(v)
      setRep({ busy: true, done: i + 1, list: [...list], failed })
    }
    setRep({ busy: false, done: pos.length, list, failed })
  }
  const deviations = rep?.list.filter(v => v.deviation) ?? []
  const pct = (x: number) => `${Math.round(x * 100)}%`
  const askAi = async () => {
    setAi({ text: null, busy: true, failed: false })
    const text = await qwenLetter(profile)
    setAi({ text, busy: false, failed: !text })
  }

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass mycoach" onClick={e => e.stopPropagation()}>
        <h2>🧠 My Coach <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        {!games ? <p className="mute">Reading your games…</p> : (
          <>
            <div className="letter">
              <pre>{ai.text ?? templateLetter(profile)}</pre>
              {ai.text && <span className="badge">AI coach · Qwen (local)</span>}
              {aiCoach && profile.games > 0 && <button className="ghost small-btn" disabled={ai.busy} onClick={askAi}>{ai.busy ? 'Qwen is thinking…' : '✨ Ask my AI coach'}</button>}
              {!aiCoach && profile.games > 0 && <p className="small mute">Turn on "Local AI coach" in the coach panel for a personal letter from Qwen.</p>}
              {ai.failed && <p className="small warn">Qwen did not answer. Start LM Studio: <code>lms server start --cors</code> and load the model.</p>}
            </div>

            {plan.drills.length > 0 && (
              <button className="primary" onClick={() => go(() => startPersonal(plan.drills))}>🎯 Train my weaknesses · {plan.drills.length} positions from my games</button>
            )}

            {profile.weaknesses.length > 0 && <h4>What keeps going wrong</h4>}
            <div className="weak-list">
              {profile.weaknesses.map(w => {
                const own = drillsFor(w)
                const first = lessons.find(l => l.id === w.lessons[0])
                return (
                  <div key={w.id} className="weak">
                    <div className="top"><b>{w.title}</b>{w.trend && <small>{TREND[w.trend]}</small>}</div>
                    <div className="sev" aria-label={`Priority ${Math.round(w.severity * 100)} of 100`}><div style={{ width: `${Math.round(w.severity * 100)}%` }} /></div>
                    <p className="small mute">{w.detail}</p>
                    <div className="btns">
                      {own.length > 0 && <button onClick={() => go(() => startPersonal(own))}>🎯 My positions ({own.length})</button>}
                      {first && <button onClick={() => go(() => startDrill(first, 'lesson'))}>🎓 {first.title}</button>}
                      <button onClick={() => go(() => { usePuzzles.getState().set({ theme: w.theme }); void nextPuzzle() })}>⚔ Puzzles</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {profile.games > 0 && (
              <>
                <h4>Openings vs the masters</h4>
                {!rep && <button className="ghost small-btn" onClick={checkOpenings}>📖 Check my openings (Lichess masters database)</button>}
                {rep?.busy && <p className="small mute">Checking position {rep.done}…</p>}
                {rep && !rep.busy && !rep.list.length && <p className="small mute">{rep.failed ? 'The Lichess explorer is not reachable right now.' : 'Not enough master games for your positions yet.'}</p>}
                {rep && rep.list.length > 0 && (
                  <table className="games">
                    <thead><tr><th>Move</th><th>You play</th><th>Masters play</th></tr></thead>
                    <tbody>{rep.list.map(v => (
                      <tr key={v.pos.fen + v.pos.uci} className={v.deviation ? 'dev' : ''}>
                        <td>{Math.ceil(v.pos.ply / 2)}</td>
                        <td>{v.deviation ? '⚠ ' : '✓ '}{v.pos.san} <span className="mute">({pct(v.share)})</span></td>
                        <td>{v.top.map(t => `${t.san} ${pct(t.share)}`).join(', ') || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
                {deviations.length > 0 && !rep?.busy && <button className="primary" onClick={() => go(() => startPersonal(deviations.map(toDrill)))}>📖 Drill the main moves ({deviations.length})</button>}
              </>
            )}

            {profile.strengths.length > 0 && <><h4>Strengths</h4><ul className="strengths">{profile.strengths.map(s => <li key={s}>✓ {s}</li>)}</ul></>}

            {profile.openings.length > 0 && (
              <>
                <h4>Your openings</h4>
                <table className="games">
                  <thead><tr><th>First moves</th><th>Games</th><th>Score</th><th>Accuracy</th></tr></thead>
                  <tbody>{profile.openings.map(o => <tr key={o.line}><td>{o.line}</td><td>{o.games}</td><td>{Math.round(o.score * 100)}%</td><td>{o.accuracy}%</td></tr>)}</tbody>
                </table>
              </>
            )}
            <p className="small mute">Everything stays on this device. The AI coach only receives the summary numbers above.</p>
          </>
        )}
      </div>
    </div>
  )
}
