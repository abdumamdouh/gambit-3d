import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../game/store'
import { glow, sqPos } from './geometry'
import { Arrow } from './Arrow'
import { useView } from './view'
import { useCoach } from '../coach/coach-store'
import { useReview } from '../coach/review-store'

const dotGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32)
const ringGeo = new THREE.RingGeometry(0.38, 0.46, 64)
const tileGeo = new THREE.PlaneGeometry(0.98, 0.98)
const MAT = {
  dot: glow(0xf6d58e, 2.6),
  cap: glow(0xff6b6b, 2.4),
  sel: glow(0xe2b45c, 2.2),
  last: glow(0xe2b45c, 1, 0.22),
  check: glow(0xff3b3b, 1.4, 0.55),
  hover: glow(0x4fd1c5, 1.3, 0.42),
}
const FLAT = [-Math.PI / 2, 0, 0] as const

export function Markers() {
  const selected = useGame(s => s.selected)
  const fen = useGame(s => s.fen)
  const liveLast = useGame(s => s.lastMove)
  const viewPly = useGame(s => s.viewPly)
  const history = useGame(s => s.history)
  const hint = useCoach(s => s.hint)
  const review = useReview(s => (s.open && s.status === 'done' && viewPly ? s.plies[viewPly - 1] : null))
  const lastMove = viewPly === null ? liveLast : viewPly > 0 ? { from: history[viewPly - 1].from, to: history[viewPly - 1].to } : null
  const pieces = useGame(s => s.pieces)
  const legalMoves = useGame(s => s.legalMoves)
  const pulse = useRef<THREE.Group>(null)
  const hover = useView(s => s.hover)
  const playerColor = useGame(s => s.playerColor)

  const moves = useMemo(() => (selected ? legalMoves(selected) : []), [selected, fen, legalMoves]) // eslint-disable-line react-hooks/exhaustive-deps
  const checkSq = useMemo(() => {
    const s = useGame.getState()
    const h = s.history[s.history.length - 1]
    if (!h?.san.match(/[+#]/)) return null
    return pieces.find(p => !p.captured && p.type === 'k' && p.color === s.turn())?.square ?? null
  }, [fen, pieces]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show what a click will do: own piece → select, legal target → move.
  const own = hover ? pieces.some(p => !p.captured && p.square === hover && p.color === playerColor) : false
  const target = hover ? moves.some(m => m.to === hover) : false
  const clickable = viewPly === null && (own || target)
  useEffect(() => { document.body.style.cursor = clickable ? 'pointer' : 'default' }, [clickable])

  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.12
    pulse.current?.children.forEach(c => c.scale.set(s, s, c.userData.ring ? 1 : s))
  })

  return (
    <group>
      {lastMove && [lastMove.from, lastMove.to].map(sq => (
        <mesh key={'l' + sq} geometry={tileGeo} material={MAT.last} rotation={FLAT} position={sqPos(sq).setY(0.002)} />
      ))}
      {viewPly === null && hint && <Arrow from={hint.from} to={hint.to} />}
      {review?.best && review.label !== 'best' && <Arrow from={review.best.from} to={review.best.to} />}
      {viewPly === null && checkSq && <mesh geometry={tileGeo} material={MAT.check} rotation={FLAT} position={sqPos(checkSq).setY(0.003)} />}
      {clickable && hover !== selected && <mesh geometry={tileGeo} material={MAT.hover} rotation={FLAT} position={sqPos(hover!).setY(0.003)} />}
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
