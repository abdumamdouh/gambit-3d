import { useEffect } from 'react'
import { STEPS, initDemo } from '../polish/demo'
import { useApp } from './app-store'

/** Invisible step buttons for the recorder (#demo-1 … #demo-9) and the closing card. */
export default function DemoLayer() {
  const endCard = useApp(s => s.endCard)
  useEffect(() => { void initDemo() }, [])
  return (
    <>
      <div className="demo-steps" aria-hidden>
        {Object.keys(STEPS).map(n => <button key={n} id={`demo-${n}`} tabIndex={-1} onClick={() => void STEPS[+n]()} />)}
      </div>
      {endCard && (
        <div className="end-card">
          <div className="crown">♛</div>
          <h1>GAMBIT <span>3D</span></h1>
          <p>A 3D chess coach that learns how you play.</p>
          <p className="url">gambit-3d-chess.vercel.app</p>
          <p className="small">Free · Open source · Works offline · Built with Claude Code</p>
        </div>
      )}
    </>
  )
}
