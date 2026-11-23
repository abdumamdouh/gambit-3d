import { THEMES, useTheme } from '../scene/themes'

export function ThemePicker({ onClose }: { onClose(): void }) {
  const { theme, setTheme } = useTheme()
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
      </div>
    </div>
  )
}
