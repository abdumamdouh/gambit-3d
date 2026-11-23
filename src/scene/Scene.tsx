import { useEffect, useState } from 'react'
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
  const q = QUALITY[quality === 'flat' ? 'low' : quality]
  const [dpr, setDpr] = useState(q.dpr[1])
  useEffect(() => setDpr(q.dpr[1]), [q.dpr])
  if (quality === 'flat') return <Board2D />
  return (
    <Canvas key={quality} shadows={q.shadows} dpr={dpr} camera={{ fov: 38, position: [15, 10, -13], near: 0.1, far: 100 }} onPointerMissed={() => document.body.style.cursor = 'default'}>
      {/* Slow device: lower the render resolution, never rebuild the canvas (rebuilding is what stutters). */}
      <PerformanceMonitor iterations={20} flipflops={3} onDecline={() => setDpr(1)} onIncline={() => setDpr(q.dpr[1])} />
      <Studio />
      <Board />
      <Pieces />
      <Markers />
      <CameraRig />
    </Canvas>
  )
}
