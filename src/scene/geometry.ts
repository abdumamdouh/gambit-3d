import * as THREE from 'three'
import type { Color, PieceType } from '../game/pieces'

/** Square name → world position. White's first rank is at +z. */
export const sqPos = (sq: string) => new THREE.Vector3(sq.charCodeAt(0) - 97 - 3.5, 0, 3.5 - (+sq[1] - 1))

/** HDR colour that ignores tone mapping, so bloom picks it up. */
export const glow = (hex: number | string, k: number, opacity = 0.95) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false, transparent: true, opacity, depthWrite: false })

function marbleTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 512, 512)
  grd.addColorStop(0, '#d6cdbb')
  grd.addColorStop(1, '#bfb39c')
  g.fillStyle = grd
  g.fillRect(0, 0, 512, 512)
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${120 + rnd() * 40},${110 + rnd() * 30},${90 + rnd() * 30},${0.08 + rnd() * 0.18})`
    g.lineWidth = 0.6 + rnd() * 2.2
    g.beginPath()
    let x = rnd() * 512, y = rnd() * 512
    g.moveTo(x, y)
    for (let k = 0; k < 6; k++) {
      const nx = x + (rnd() - 0.3) * 200, ny = y + (rnd() - 0.5) * 160
      g.quadraticCurveTo((x + nx) / 2 + (rnd() - 0.5) * 80, (y + ny) / 2 + (rnd() - 0.5) * 80, nx, ny)
      x = nx; y = ny
    }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function labelTexture(txt: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#c9a35c'
  g.font = '600 38px Georgia'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(txt, 32, 34)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ponytail: module singletons; one app, one board, materials shared by all meshes.
export const M = {
  light: new THREE.MeshPhysicalMaterial({ map: marbleTexture(), roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.3 }),
  dark: new THREE.MeshPhysicalMaterial({ color: 0x1a1c23, roughness: 0.3, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.22 }),
  frame: new THREE.MeshPhysicalMaterial({ color: 0x111216, roughness: 0.35, metalness: 0.3, clearcoat: 0.8 }),
  inlay: new THREE.MeshStandardMaterial({ color: 0xd8a94e, metalness: 1, roughness: 0.25, emissive: 0x6b4a12, emissiveIntensity: 0.6 }),
  w: new THREE.MeshPhysicalMaterial({ color: 0xe6dccb, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xfff1d2) }),
  b: new THREE.MeshPhysicalMaterial({ color: 0x0e0f14, roughness: 0.16, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.3, iridescenceIOR: 1.4 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9aa50, metalness: 1, roughness: 0.2 }),
}

// ---------- pieces ----------
type Pt = [number, number]
const V = ([x, y]: Pt) => new THREE.Vector2(Math.max(0, x), y)
const BASE: Pt[] = [[0, 0], [0.37, 0], [0.385, 0.03], [0.37, 0.07], [0.33, 0.09], [0.33, 0.12], [0.29, 0.14]]
const spl = (pts: Pt[]): Pt[] => new THREE.SplineCurve(pts.map(V)).getPoints(40).map(v => [v.x, v.y])
const cap = (cy: number, r: number, a0: number): Pt[] => {
  const o: Pt[] = []
  for (let i = 0; i <= 16; i++) { const a = a0 + (Math.PI / 2 - a0) * (i / 16); o.push([r * Math.cos(a), cy + r * Math.sin(a)]) }
  return o
}

const PROFILES: Record<PieceType, Pt[]> = {
  p: [...BASE, ...spl([[0.29, 0.14], [0.2, 0.2], [0.15, 0.3], [0.13, 0.4], [0.2, 0.45], [0.21, 0.48], [0.12, 0.5]]), ...cap(0.62, 0.14, -Math.PI / 2 + 0.6)],
  r: [...BASE, ...spl([[0.29, 0.14], [0.24, 0.2], [0.21, 0.35], [0.2, 0.55], [0.25, 0.6], [0.28, 0.63]]), [0.28, 0.78], [0.2, 0.78], [0.2, 0.72], [0, 0.72]],
  b: [...BASE, ...spl([[0.29, 0.14], [0.2, 0.22], [0.15, 0.4], [0.13, 0.55], [0.21, 0.6], [0.22, 0.63], [0.12, 0.66], [0.17, 0.72], [0.18, 0.82], [0.13, 0.92], [0.05, 0.99], [0.0, 1.01]])],
  q: [...BASE, ...spl([[0.29, 0.14], [0.22, 0.22], [0.16, 0.45], [0.14, 0.7], [0.23, 0.76], [0.24, 0.8], [0.15, 0.83], [0.2, 0.95], [0.27, 1.06]]), [0.27, 1.08], [0.19, 1.08], [0.13, 1.04], [0, 1.04]],
  k: [...BASE, ...spl([[0.29, 0.14], [0.22, 0.22], [0.17, 0.45], [0.15, 0.78], [0.24, 0.83], [0.25, 0.87], [0.16, 0.9], [0.22, 1.02], [0.25, 1.12]]), [0.25, 1.14], [0.12, 1.17], [0, 1.18]],
  n: [...BASE, ...spl([[0.29, 0.14], [0.27, 0.17], [0.26, 0.2]]), [0, 0.2]],
}

const geoCache = new Map<string, THREE.BufferGeometry>()
const cached = (key: string, make: () => THREE.BufferGeometry) => {
  if (!geoCache.has(key)) geoCache.set(key, make())
  return geoCache.get(key)!
}
const latheGeo = (t: PieceType) => cached('lathe' + t, () => { const g = new THREE.LatheGeometry(PROFILES[t].map(V), 64); g.computeVertexNormals(); return g })

function knightGeo() {
  return cached('knight', () => {
    const P: Pt[] = [[0.2, 0], [0.17, 0.2], [0.06, 0.36], [0.18, 0.44], [0.36, 0.5], [0.42, 0.56], [0.38, 0.63], [0.2, 0.72], [0.12, 0.78], [0.1, 0.9], [0.04, 0.96], [0.0, 0.83], [-0.07, 0.8], [-0.17, 0.69], [-0.14, 0.63], [-0.23, 0.56], [-0.2, 0.5], [-0.28, 0.42], [-0.25, 0.34], [-0.31, 0.2], [-0.27, 0.05], [-0.2, 0]]
    const s = new THREE.Shape()
    s.moveTo(P[0][0], P[0][1])
    s.splineThru(P.slice(1).map(([x, y]) => new THREE.Vector2(x, y)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 8, curveSegments: 64 })
    g.translate(0, 0, -0.08)
    g.computeVertexNormals()
    return g
  })
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function makePiece(type: PieceType, color: Color) {
  const mat = M[color]
  const grp = new THREE.Group()
  grp.add(mesh(latheGeo(type), mat))
  const collar = mesh(cached('collar', () => new THREE.TorusGeometry(0.305, 0.012, 12, 64)), M.gold, 0, 0.13, 0)
  collar.rotation.x = Math.PI / 2
  grp.add(collar)
  if (type === 'r') {
    const box = cached('crenel', () => new THREE.BoxGeometry(0.12, 0.08, 0.12))
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; grp.add(mesh(box, mat, Math.cos(a) * 0.235, 0.82, Math.sin(a) * 0.235)) }
  }
  if (type === 'b') grp.add(mesh(cached('ball05', () => new THREE.SphereGeometry(0.05, 24, 16)), M.gold, 0, 1.05, 0))
  if (type === 'q') {
    const s = cached('ball035', () => new THREE.SphereGeometry(0.035, 16, 12))
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; grp.add(mesh(s, M.gold, Math.cos(a) * 0.25, 1.11, Math.sin(a) * 0.25)) }
    grp.add(mesh(cached('ball075', () => new THREE.SphereGeometry(0.075, 24, 16)), M.gold, 0, 1.13, 0))
  }
  if (type === 'k') {
    grp.add(mesh(cached('crossV', () => new THREE.BoxGeometry(0.06, 0.28, 0.06)), M.gold, 0, 1.32, 0))
    grp.add(mesh(cached('crossH', () => new THREE.BoxGeometry(0.2, 0.06, 0.06)), M.gold, 0, 1.35, 0))
  }
  if (type === 'n') {
    const h = mesh(knightGeo(), mat, 0, 0.18, 0)
    h.rotation.y = color === 'w' ? 0.75 : Math.PI - 0.75 /* 3/4 view so the profile reads from the player camera */
    const eye = cached('eye', () => new THREE.SphereGeometry(0.026, 16, 12))
    for (const z of [-0.15, 0.15]) h.add(mesh(eye, M.gold, 0.2, 0.66, z))
    grp.add(h)
  }
  grp.scale.setScalar(0.95)
  return grp
}
