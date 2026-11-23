import { create } from 'zustand'

export type CamPreset = 'player' | 'top' | 'low' | 'orbit'
export const useView = create<{ cam: CamPreset; nonce: number; zoom: number; zoomNonce: number; setCam(c: CamPreset): void; zoomBy(f: number): void }>(set => ({
  cam: 'player',
  nonce: 0,
  zoom: 1,
  zoomNonce: 0,
  setCam: cam => set(s => ({ cam, nonce: s.nonce + 1 })),
  /** f < 1 zooms in, f > 1 zooms out. */
  zoomBy: f => set(s => ({ zoom: f, zoomNonce: s.zoomNonce + 1 })),
}))
