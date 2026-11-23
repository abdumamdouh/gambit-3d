import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../game/store'
import { glow, sqPos } from './geometry'

const dotGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32)
const ringGeo = new THREE.RingGeometry(0.38, 0.46, 64)
const tileGeo = new THREE.PlaneGeometry(0.98, 0.98)
const MAT = {
  dot: glow(0xf6d58e, 2.6),
  cap: glow(0xff6b6b, 2.4),
  sel: glow(0xe2b45c, 2.2),
  last: glow(0xe2b45c, 1, 0.22),
  check: glow(0xff3b3b, 1.4, 0.55),
}
const FLAT = [-Math.PI / 2, 0, 0] as const

export function Markers() {
  const selected = useGame(s => s.selected)
  const fen = useGame(s => s.fen)
  const lastMove = useGame(s => s.lastMove)
  const pieces = useGame(s => s.pieces)
  const legalMoves = useGame(s => s.legalMoves)
  const pulse = useRef<THREE.Group>(null)

  const moves = useMemo(() => (selected ? legalMoves(selected) : []), [selected, fen, legalMoves]) // eslint-disable-line react-hooks/exhaustive-deps
  const checkSq = useMemo(() => {
    const s = useGame.getState()
    const h = s.history[s.history.length - 1]
    if (!h?.san.match(/[+#]/)) return null
    return pieces.find(p => !p.captured && p.type === 'k' && p.color === s.turn())?.square ?? null
  }, [fen, pieces]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.12
    pulse.current?.children.forEach(c => c.scale.set(s, s, c.userData.ring ? 1 : s))
  })

  return (
    <group>
      {lastMove && [lastMove.from, lastMove.to].map(sq => (
        <mesh key={'l' + sq} geometry={tileGeo} material={MAT.last} rotation={FLAT} position={sqPos(sq).setY(0.002)} />
      ))}
      {checkSq && <mesh geometry={tileGeo} material={MAT.check} rotation={FLAT} position={sqPos(checkSq).setY(0.003)} />}
      {selected && <mesh geometry={ringGeo} material={MAT.sel} rotation={FLAT} position={sqPos(selected).setY(0.004)} />}
      <group ref={pulse}>
        {moves.map(m => {
          const cap = m.flags.includes('c') || m.flags.includes('e')
          return cap
            ? <mesh key={m.to} userData={{ ring: true }} geometry={ringGeo} material={MAT.cap} rotation={FLAT} position={sqPos(m.to).setY(0.012)} />
            : <mesh key={m.to} geometry={dotGeo} material={MAT.dot} position={sqPos(m.to).setY(0.012)} />
        })}
      </group>
    </group>
  )
}
