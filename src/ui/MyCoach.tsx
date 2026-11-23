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

const TREND = { better: '📈 improving', worse: '📉 getting worse', same: '➡️ no change' } as const

export function MyCoachDialog({ onClose }: { onClose(): void }) {
  const [games, setGames] = useState<GameRecord[] | null>(null)
  const [ai, setAi] = useState<{ text: string | null; busy: boolean; failed: boolean }>({ text: null, busy: false, failed: false })
  const aiCoach = useCoach(s => s.aiCoach)
  useEffect(() => { allGames().then(setGames) }, [])
  const profile = useMemo(() => analyzeStyle(games ?? []), [games])
  const plan = useMemo(() => generatePlan(profile, fixedSet()), [profile])
  const lessons = allLessons()
  const go = (fn: () => void) => { useApp.getState().set({ dialog: false }); onClose(); fn() }
  const drillsFor = (w: Weakness) => generatePlan({ ...profile, weaknesses: [w] }, fixedSet()).drills
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
