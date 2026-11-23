import { create } from 'zustand'

export type EngineStatus = 'loading' | 'ready' | 'fallback'
export type Panel = null | 'progress' | 'style' | 'academy' | 'tactics' | 'online' | 'mycoach'

export const useApp = create<{
  engine: EngineStatus
  thinking: boolean
  dialog: boolean
  panel: Panel
  set(p: Partial<{ engine: EngineStatus; thinking: boolean; dialog: boolean; panel: Panel }>): void
}>(set => ({ engine: 'loading', thinking: false, dialog: true, panel: null, set }))
