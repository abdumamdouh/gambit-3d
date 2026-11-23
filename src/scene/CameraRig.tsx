import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import { useGame } from '../game/store'
import { useView, type CamPreset } from './view'

const PRESETS: Record<CamPreset, [number[], number[]]> = {
  player: [[0, 7.4, 9.2], [0, 0, 0.6]],
  top: [[0, 17, 0.01], [0, 0, 0]],
  low: [[-6.5, 2.4, 7], [0, 0.4, 0]],
  orbit: [[9, 5.5, 9], [0, 0, 0]],
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function CameraRig() {
  const { camera } = useThree()
  const aspect = useThree(s => s.size.width / s.size.height)
  const controls = useRef<OrbitImpl>(null)
  const cam = useView(s => s.cam)
  const nonce = useView(s => s.nonce)
  const color = useGame(s => s.playerColor)
  const gameId = useGame(s => s.gameId)
  const zoomNonce = useView(s => s.zoomNonce)
  const freeCam = useView(s => s.freeCam)
  const tw = useRef({ t: 1, dur: 1.4, p0: new THREE.Vector3(), p1: new THREE.Vector3(), t0: new THREE.Vector3(), t1: new THREE.Vector3() })
  const first = useRef(true)

  // Portrait screens: wider lens and pull back so all 8 files fit.
  const pull = aspect < 1 ? Math.min(2.1, 0.92 / aspect) : 1
  useEffect(() => {
    const pc = camera as THREE.PerspectiveCamera
    pc.fov = aspect < 1 ? 50 : 38
    pc.updateProjectionMatrix()
  }, [aspect, camera])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const flip = color === 'b' ? -1 : 1
    const [p, t] = PRESETS[cam]
    Object.assign(tw.current, {
      t: 0,
      dur: first.current ? 2.8 : 1.4,
      p0: camera.position.clone(),
      t0: c.target.clone(),
      p1: new THREE.Vector3(p[0] * flip, p[1], p[2] * flip).multiplyScalar(pull),
      t1: new THREE.Vector3(t[0] * flip, t[1], t[2] * flip),
    })
    first.current = false
    c.autoRotate = cam === 'orbit'
  }, [cam, nonce, color, gameId, camera, pull])

  // Zoom buttons: dolly toward/away from the target, inside the orbit limits.
  useEffect(() => {
    const c = controls.current
    if (!c || !zoomNonce) return
    const f = useView.getState().zoom
    const off = camera.position.clone().sub(c.target)
    const d = THREE.MathUtils.clamp(off.length() * f, c.minDistance, c.maxDistance)
    Object.assign(tw.current, { t: 0, dur: 0.35, p0: camera.position.clone(), t0: c.target.clone(), p1: c.target.clone().add(off.setLength(d)), t1: c.target.clone() })
  }, [zoomNonce, camera])

  useFrame((_, dt) => {
    const a = tw.current, c = controls.current
    if (!c || a.t >= 1) return
    a.t = Math.min(1, a.t + dt / a.dur)
    const e = ease(a.t)
    camera.position.lerpVectors(a.p0, a.p1, e)
    c.target.lerpVectors(a.t0, a.t1, e)
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={5}
      maxDistance={34}
      maxPolarAngle={1.38}
      autoRotateSpeed={0.6}
      onStart={() => { tw.current.t = 1 }}
      // Left button selects pieces. Rotate with right-drag or two fingers (or turn on Free camera).
      mouseButtons={{ LEFT: freeCam ? THREE.MOUSE.ROTATE : (-1 as THREE.MOUSE), MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
      touches={{ ONE: freeCam ? THREE.TOUCH.ROTATE : (-1 as THREE.TOUCH), TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  )
}
