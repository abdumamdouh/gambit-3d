import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGame, piecesAt } from '../game/store'
import type { Piece } from '../game/pieces'
import { makePiece, sqPos } from './geometry'
import { onSquareClick } from './input'
import { useView } from './view'

const HIT = new THREE.CylinderGeometry(0.4, 0.4, 1.3, 12)
const HIT_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const MOVE_S = 0.48
const DIE_S = 0.5

function PieceMesh({ piece, selected }: { piece: Piece; selected: boolean }) {
  const obj = useMemo(() => makePiece(piece.type, piece.color), [piece.type, piece.color])
  const anim = useRef({ from: sqPos(piece.square), to: sqPos(piece.square), t: 1, die: piece.captured ? 1 : 0, arc: 0.45 })

  // First render: place without animation.
  useEffect(() => { obj.position.copy(sqPos(piece.square)) }, [obj]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const a = anim.current
    const target = sqPos(piece.square)
    if (!a.to.equals(target)) {
      a.from = obj.position.clone().setY(0)
      a.to = target
      a.t = 0
      a.arc = piece.type === 'n' ? 0.9 : 0.45
    }
    if (!piece.captured) { a.die = 0; obj.visible = true; obj.scale.setScalar(0.95); obj.rotation.z = 0 }
  }, [piece.square, piece.captured, piece.type, obj])

  useFrame((state, dt) => {
    const a = anim.current
    if (piece.captured) {
      if (a.die >= 1) { obj.visible = false; return }
      a.die = Math.min(1, a.die + dt / DIE_S)
      obj.position.y = -a.die * 0.9
      obj.scale.setScalar(0.95 * (1 - a.die * 0.6))
      obj.rotation.z = a.die * 0.6
      return
    }
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt / MOVE_S)
      const e = ease(a.t)
      obj.position.lerpVectors(a.from, a.to, e)
      obj.position.y = Math.sin(Math.PI * e) * a.arc
      return
    }
    const lift = selected ? 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.04 : 0
    obj.position.x = a.to.x
    obj.position.z = a.to.z
    obj.position.y = THREE.MathUtils.damp(obj.position.y, lift, 12, dt)
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8 || piece.captured) return
    e.stopPropagation()
    onSquareClick(piece.square)
  }

  // Input: a 12-sided invisible cylinder per piece. Clicking a piece's head picks that piece,
  // not the square behind it, and costs ~1% of raycasting the detailed mesh.
  return (
    <primitive object={obj}>
      {!piece.captured && (
        <mesh geometry={HIT} material={HIT_MAT} position-y={0.62} onClick={click}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); useView.getState().setHover(piece.square) }}
          onPointerOut={() => useView.getState().setHover(null)} />
      )}
    </primitive>
  )
}

export function Pieces() {
  const live = useGame(s => s.pieces)
  const history = useGame(s => s.history)
  const viewPly = useGame(s => s.viewPly)
  const startFen = useGame(s => s.startFen)
  const pieces = useMemo(() => (viewPly === null ? live : piecesAt(history, viewPly, startFen)), [live, history, viewPly, startFen])
  const selected = useGame(s => s.selected)
  const gameId = useGame(s => s.gameId)
  return (
    <group key={gameId}>
      {pieces.map(p => <PieceMesh key={p.id} piece={p} selected={selected === p.square && !p.captured} />)}
    </group>
  )
}
