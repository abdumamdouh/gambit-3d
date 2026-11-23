import { useState } from 'react'
import { useOnline, hostFriendGame, seekLichess, leaveOnline } from '../online/session'
import { login, logout } from '../online/lichess'
import { useApp } from './app-store'

const SEEKS: [number, number][] = [[10, 0], [15, 10], [30, 0]]

export function OnlineDialog({ onClose }: { onClose(): void }) {
  const o = useOnline()
  const [copied, setCopied] = useState(false)
  const start = (fn: () => void) => { useApp.getState().set({ dialog: false }); fn() }
  const copy = async () => { try { await navigator.clipboard.writeText(o.link); setCopied(true) } catch { setCopied(false) } }
  const busy = o.status === 'hosting' || o.status === 'seeking' || o.status === 'connecting'
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal glass wide" onClick={e => e.stopPropagation()}>
        <h2>🌐 Play online <button className="x" onClick={onClose} aria-label="Close">✕</button></h2>
        <div className="online-grid">
          <section>
            <h4>Play a friend</h4>
            <p className="small mute">Peer-to-peer. No account. You play White.</p>
            {o.kind === 'friend' && o.link ? (
              <>
                <input className="link" readOnly value={o.link} onFocus={e => e.target.select()} />
                <button className="ghost" onClick={copy}>{copied ? '✓ Copied' : 'Copy link'}</button>
              </>
            ) : <button className="primary" disabled={busy} onClick={() => start(() => hostFriendGame('w'))}>Create invite link</button>}
          </section>
          <section>
            <h4>Play on Lichess</h4>
            <p className="small mute">Real players, on this 3D board. Free Lichess account. Casual rapid/classical.</p>
            {o.user ? (
              <>
                <p className="small">Signed in as <b>{o.user}</b> · <button className="linkish" onClick={async () => { await logout(); useOnline.setState({ user: null }) }}>sign out</button></p>
                <div className="seg">{SEEKS.map(([m, i]) => <button key={`${m}+${i}`} disabled={busy} onClick={() => start(() => seekLichess(m, i))}>{m}+{i}</button>)}</div>
              </>
            ) : <button className="primary" onClick={() => login()}>Sign in with Lichess</button>}
          </section>
        </div>
        {o.message && <p className={`note ${o.status === 'error' ? 'failed' : 'playing'}`}>{o.message}</p>}
        {busy && <button className="ghost" onClick={leaveOnline}>Cancel</button>}
      </div>
    </div>
  )
}
