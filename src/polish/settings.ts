import { create } from 'zustand'

export type Quality = 'high' | 'medium' | 'low' | 'flat'
interface Settings { quality: Quality; sound: boolean; voice: boolean; set(p: Partial<Pick<Settings, 'quality' | 'sound' | 'voice'>>): void }

const KEY = 'g3d.settings'
const hasWebGL = () => { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } }
const load = (): Pick<Settings, 'quality' | 'sound' | 'voice'> => {
  const d = { quality: (hasWebGL() ? 'high' : 'flat') as Quality, sound: true, voice: false }
  try { return { ...d, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return d }
}

export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  set(p) {
    set(p)
    try { localStorage.setItem(KEY, JSON.stringify({ quality: get().quality, sound: get().sound, voice: get().voice })) } catch { /* private mode */ }
  },
}))

export const QUALITY: Record<Exclude<Quality, 'flat'>, { dpr: [number, number]; shadows: boolean; bloom: boolean; dust: boolean }> = {
  high: { dpr: [1, 2], shadows: true, bloom: true, dust: true },
  medium: { dpr: [1, 1.5], shadows: true, bloom: false, dust: true },
  low: { dpr: [1, 1], shadows: false, bloom: false, dust: false },
}
