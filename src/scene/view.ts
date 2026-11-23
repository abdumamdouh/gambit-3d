import { create } from 'zustand'

export type CamPreset = 'player' | 'top' | 'low' | 'orbit'
export const useView = create<{ cam: CamPreset; nonce: number; setCam(c: CamPreset): void }>(set => ({
  cam: 'player',
  nonce: 0,
  setCam: cam => set(s => ({ cam, nonce: s.nonce + 1 })),
}))
