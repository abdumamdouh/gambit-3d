import { Canvas } from '@react-three/fiber'
import { Studio } from './Studio'
import { Board } from './Board'
import { Pieces } from './Pieces'
import { Markers } from './Markers'
import { CameraRig } from './CameraRig'

export function Scene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 38, position: [15, 10, -13], near: 0.1, far: 100 }} onPointerMissed={() => document.body.style.cursor = 'default'}>
      <Studio />
      <Board />
      <Pieces />
      <Markers />
      <CameraRig />
    </Canvas>
  )
}
