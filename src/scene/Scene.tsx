import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useSettings, QUALITY } from '../polish/settings'
import { Board2D } from '../ui/Board2D'
import { Studio } from './Studio'
import { Board } from './Board'
import { Pieces } from './Pieces'
import { Markers } from './Markers'
import { CameraRig } from './CameraRig'

export function Scene() {
  const quality = useSettings(s => s.quality)
  if (quality === 'flat') return <Board2D />
  const q = QUALITY[quality]
  return (
    <Canvas key={quality} shadows={q.shadows} dpr={q.dpr} camera={{ fov: 38, position: [15, 10, -13], near: 0.1, far: 100 }} onPointerMissed={() => document.body.style.cursor = 'default'}>
      {/* Slow device (real phones): step quality down once per decline, never to 2D. */}
      <PerformanceMonitor flipflops={2} onDecline={() => { const n = quality === 'high' ? 'medium' : quality === 'medium' ? 'low' : null; if (n) useSettings.getState().set({ quality: n }) }} />
      <Studio />
      <Board />
      <Pieces />
      <Markers />
      <CameraRig />
    </Canvas>
  )
}
