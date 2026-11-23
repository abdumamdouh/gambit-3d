import * as THREE from 'three'
import { create } from 'zustand'
import { M } from './geometry'

export type ThemeId = 'obsidian' | 'walnut' | 'crystal' | 'neon'
type Mat = THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial
type Props = Record<string, unknown>

export const THEMES: { id: ThemeId; name: string; blurb: string; swatch: [string, string, string] }[] = [
  { id: 'obsidian', name: 'Obsidian & Ivory', blurb: 'Marble board, gold trim', swatch: ['#e6dccb', '#0e0f14', '#d9aa50'] },
  { id: 'walnut', name: 'Walnut Classic', blurb: 'Wood board, boxwood & ebony', swatch: ['#d9b98a', '#3a2416', '#b98a4a'] },
  { id: 'crystal', name: 'Crystal', blurb: 'Glass pieces, frosted board', swatch: ['#e8f4ff', '#5b6b8c', '#cfd8e6'] },
  { id: 'neon', name: 'Neon Night', blurb: 'Chrome vs magenta glow', swatch: ['#c7d0dc', '#ff2bd6', '#22e6ff'] },
]

function woodTexture(light: boolean) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = light ? '#caa271' : '#4a2c18'
  g.fillRect(0, 0, 512, 512)
  let s = light ? 11 : 23
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 140; i++) {
    const y = rnd() * 512
    g.strokeStyle = light ? `rgba(120,80,40,${0.05 + rnd() * 0.12})` : `rgba(20,10,4,${0.1 + rnd() * 0.25})`
    g.lineWidth = 0.5 + rnd() * 2.5
    g.beginPath()
    g.moveTo(0, y)
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6 * rnd())
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const marble = M.light.map
let woodL: THREE.Texture | null = null
let woodD: THREE.Texture | null = null
const wood = () => { woodL ??= woodTexture(true); woodD ??= woodTexture(false); return [woodL, woodD] as const }

// Every key a theme may touch is reset first, so switching never leaks a property.
const BASE: Record<keyof typeof M, Props> = {
  light: { map: null, color: '#ffffff', roughness: 0.4, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.3, transmission: 0, emissive: '#000000', emissiveIntensity: 0 },
  dark: { map: null, color: '#1a1c23', roughness: 0.3, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.22, transmission: 0, emissive: '#000000', emissiveIntensity: 0 },
  frame: { map: null, color: '#111216', roughness: 0.35, metalness: 0.3, clearcoat: 0.8 },
  inlay: { color: '#d8a94e', metalness: 1, roughness: 0.25, emissive: '#6b4a12', emissiveIntensity: 0.6 },
  w: { color: '#e6dccb', roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, transmission: 0, thickness: 0, ior: 1.5, iridescence: 0, emissive: '#000000', emissiveIntensity: 0 },
  b: { color: '#0e0f14', roughness: 0.16, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0, transmission: 0, thickness: 0, ior: 1.5, iridescence: 0.3, emissive: '#000000', emissiveIntensity: 0 },
  gold: { color: '#d9aa50', metalness: 1, roughness: 0.2, emissive: '#000000', emissiveIntensity: 0 },
}

const PATCH: Record<ThemeId, () => Partial<Record<keyof typeof M, Props>>> = {
  obsidian: () => ({ light: { map: marble } }),
  walnut: () => {
    const [l, d] = wood()
    return {
      light: { map: l, roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.35 },
      dark: { map: d, color: '#ffffff', roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 },
      frame: { color: '#2a1a10', roughness: 0.5, metalness: 0 },
      inlay: { color: '#b98a4a', emissive: '#3a2410', emissiveIntensity: 0.4 },
      w: { color: '#d9b98a', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0 },
      b: { color: '#3a2416', roughness: 0.4, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2, iridescence: 0 },
      gold: { color: '#b98a4a', roughness: 0.35 },
    }
  },
  crystal: () => ({
    light: { color: '#dfe8f2', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 },
    dark: { color: '#3c4658', roughness: 0.2, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
    frame: { color: '#1b2230', metalness: 0.6, roughness: 0.25 },
    inlay: { color: '#cfd8e6', emissive: '#6d87b0', emissiveIntensity: 0.5 },
    w: { color: '#f4fbff', roughness: 0.05, transmission: 0.95, thickness: 0.6, ior: 1.45, clearcoat: 1, sheen: 0 },
    b: { color: '#5b6b8c', roughness: 0.08, metalness: 0, transmission: 0.85, thickness: 0.6, ior: 1.5, iridescence: 0.6 },
    gold: { color: '#cfd8e6', roughness: 0.1 },
  }),
  neon: () => ({
    light: { color: '#2a2f3a', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 },
    dark: { color: '#0a0b10', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.4 },
    frame: { color: '#07080c', metalness: 0.5 },
    inlay: { color: '#22e6ff', emissive: '#22e6ff', emissiveIntensity: 2.2 },
    w: { color: '#c7d0dc', roughness: 0.08, metalness: 1, clearcoat: 1, sheen: 0 },
    b: { color: '#2a0826', roughness: 0.2, metalness: 0.3, emissive: '#ff2bd6', emissiveIntensity: 0.55, iridescence: 0 },
    gold: { color: '#22e6ff', emissive: '#22e6ff', emissiveIntensity: 1.6 },
  }),
}

function apply(id: ThemeId) {
  const patch = PATCH[id]()
  for (const key of Object.keys(M) as (keyof typeof M)[]) {
    const mat = M[key] as Mat
    const props = { ...BASE[key], ...(patch[key] ?? {}) }
    for (const [k, v] of Object.entries(props)) {
      if (!(k in mat)) continue
      const cur = (mat as unknown as Record<string, unknown>)[k]
      if (cur instanceof THREE.Color) cur.set(v as string)
      else (mat as unknown as Record<string, unknown>)[k] = v
    }
    mat.needsUpdate = true
  }
}

const saved = (() => { try { return (localStorage.getItem('g3d.theme') as ThemeId) || 'obsidian' } catch { return 'obsidian' } })()

export const useTheme = create<{ theme: ThemeId; setTheme(t: ThemeId): void }>(set => ({
  theme: saved,
  setTheme(t) {
    apply(t)
    try { localStorage.setItem('g3d.theme', t) } catch { /* private mode */ }
    set({ theme: t })
  },
}))
apply(saved)
