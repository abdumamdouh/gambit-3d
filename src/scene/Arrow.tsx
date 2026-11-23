import { useMemo } from 'react'
import * as THREE from 'three'
import { glow, sqPos } from './geometry'

const shaftGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 16)
const headGeo = new THREE.ConeGeometry(0.2, 0.36, 24)

/** Glowing board arrow, e.g. hint or "best was". */
export function Arrow({ from, to, color = 0x4fd1c5 }: { from: string; to: string; color?: number }) {
  const mat = useMemo(() => glow(color, 2.2, 0.85), [color])
  const a = sqPos(from), b = sqPos(to)
  const len = a.distanceTo(b)
  const angle = Math.atan2(b.x - a.x, b.z - a.z)
  const shaft = Math.max(0.1, len - 0.55)
  return (
    <group position={[a.x, 0.09, a.z]} rotation={[0, angle, 0]}>
      <mesh geometry={shaftGeo} material={mat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, shaft / 2 + 0.1]} scale={[1, shaft, 1]} />
      <mesh geometry={headGeo} material={mat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, shaft + 0.28]} />
    </group>
  )
}
