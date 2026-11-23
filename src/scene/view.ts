import { create } from 'zustand'

export type CamPreset = 'player' | 'top' | 'low' | 'orbit'

const freeSaved = () => { try { return localStorage.getItem('g3d.freecam') === '1' } catch { return false } }

export const useView = create<{
  cam: CamPreset; nonce: number; zoom: number; zoomNonce: number
  /** Square under the pointer (hover highlight). */
  hover: string | null
  /** Free camera: left-drag also rotates. Off by default so clicks never turn the board. */
  freeCam: boolean
  setCam(c: CamPreset): void; zoomBy(f: number): void; setHover(s: string | null): void; toggleFreeCam(): void
}>((set, get) => ({
  cam: 'player',
  nonce: 0,
  zoom: 1,
  zoomNonce: 0,
  hover: null,
  freeCam: freeSaved(),
  setCam: cam => set(s => ({ cam, nonce: s.nonce + 1 })),
  /** f < 1 zooms in, f > 1 zooms out. */
  zoomBy: f => set(s => ({ zoom: f, zoomNonce: s.zoomNonce + 1 })),
  setHover: h => { if (get().hover !== h) set({ hover: h }) },
  toggleFreeCam: () => { const v = !get().freeCam; try { localStorage.setItem('g3d.freecam', v ? '1' : '0') } catch { /* private */ } set({ freeCam: v }) },
}))
