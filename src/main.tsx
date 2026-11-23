import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/ui.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dev-only handle for browser e2e checks (stripped from production builds).
if (import.meta.env.DEV) Promise.all([import('./game/store'), import('./scene/input'), import('./train/session')]).then(([g, i, t]) => Object.assign(window, { __game: g.useGame, __click: i.onSquareClick, __train: t.useTrain }))

// Offline + install support (production only, so dev hot reload is never cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
