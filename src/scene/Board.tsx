import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { M, glow, labelTexture, sqPos } from './geometry'
import { onSquareClick } from './input'
import { useGame } from '../game/store'

export function Board() {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const sqGeo = new THREE.BoxGeometry(1, 0.12, 1)
    for (let f = 0; f < 8; f++)
      for (let r = 0; r < 8; r++) {
        const sq = String.fromCharCode(97 + f) + (r + 1)
        const m = new THREE.Mesh(sqGeo, (f + r) % 2 ? M.light : M.dark)
        m.position.copy(sqPos(sq)).setY(-0.06)
        m.receiveShadow = true
        m.userData.square = sq
        g.add(m)
      }
    const box = (w: number, h: number, d: number, mat: THREE.Material, y: number, x = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      m.position.set(x, y, z)
      m.castShadow = m.receiveShadow = true
      g.add(m)
      return m
    }
    box(9.5, 0.5, 9.5, M.frame, -0.31)
    box(10.1, 0.18, 10.1, M.frame, -0.62)
    for (const [w, d, x, z] of [[8.26, 0.05, 0, 4.11], [8.26, 0.05, 0, -4.11], [0.05, 8.26, 4.11, 0], [0.05, 8.26, -4.11, 0]]) box(w, 0.03, d, M.inlay, -0.045, x, z)
    const neon = box(10.14, 0.02, 10.14, glow(0xe2b45c, 1.6, 0.8), -0.53)
    neon.castShadow = false
    const plane = new THREE.PlaneGeometry(0.26, 0.26)
    for (let i = 0; i < 8; i++)
      for (const [txt, x, z] of [['abcdefgh'[i], i - 3.5, 4.45], [String(i + 1), -4.45, 3.5 - i]] as const) {
        const p = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: labelTexture(txt), transparent: true }))
        p.rotation.x = -Math.PI / 2
        p.position.set(x, -0.055, z)
        p.userData.label = true
        g.add(p)
      }
    return g
  }, [])

  // Labels face the player: turn them 180° when playing Black.
  const color = useGame(s => s.playerColor)
  useEffect(() => { group.children.forEach(c => { if (c.userData.label) c.rotation.set(-Math.PI / 2, 0, color === 'b' ? Math.PI : 0) }) }, [color, group])

  const click = (e: ThreeEvent<MouseEvent>) => {
    const sq = e.object.userData.square as string | undefined
    if (!sq || e.delta > 5) return
    e.stopPropagation()
    onSquareClick(sq)
  }

  return <primitive object={group} onClick={click} />
}
