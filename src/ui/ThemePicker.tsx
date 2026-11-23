import { THEMES, useTheme } from '../scene/themes'
import { useSettings, type Quality } from '../polish/settings'
import { say } from '../polish/voice'

export function ThemePicker({ onClose }: { onClose(): void }) {
  const { theme, setTheme } = useTheme()
  const { quality, sound, voice, set } = useSettings()
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass wide" onClick={e => e.stopPropagation()}>
        <h2>Board style <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        <div className="themes">
          {THEMES.map(t => (
            <button key={t.id} className={theme === t.id ? 'on' : ''} onClick={() => setTheme(t.id)}>
              <span className="sw">{t.swatch.map(c => <i key={c} style={{ background: c }} />)}</span>
              <b>{t.name}</b>
              <small>{t.blurb}</small>
            </button>
          ))}
        </div>
        <label>Graphics</label>
        <div className="seg">
          {([['high', 'High'], ['medium', 'Medium'], ['low', 'Low (fast)'], ['flat', '2D board']] as [Quality, string][]).map(([q, n]) => (
            <button key={q} className={quality === q ? 'on' : ''} onClick={() => set({ quality: q })}>{n}</button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={sound} onChange={() => set({ sound: !sound })} /> Sound effects</label>
        <label className="check"><input type="checkbox" checked={voice} onChange={() => { set({ voice: !voice }); if (!voice) setTimeout(() => say('Voice coach is on.'), 50) }} /> 🗣 Voice coach (reads hints, lessons and reviews aloud)</label>
      </div>
    </div>
  )
}
