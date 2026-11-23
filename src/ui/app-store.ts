import { create } from 'zustand'

export type EngineStatus = 'loading' | 'ready' | 'fallback'
export type Panel = null | 'progress' | 'style' | 'academy' | 'tactics' | 'online' | 'mycoach'

export const useApp = create<{
  engine: EngineStatus
  thinking: boolean
  dialog: boolean
  panel: Panel
  /** Demo mode (?demo=1): scripted video showcase. */
  demo: boolean
  endCard: boolean
  set(p: Partial<{ engine: EngineStatus; thinking: boolean; dialog: boolean; panel: Panel; demo: boolean; endCard: boolean }>): void
}>(set => ({ engine: 'loading', thinking: false, dialog: true, panel: null, demo: false, endCard: false, set }))
