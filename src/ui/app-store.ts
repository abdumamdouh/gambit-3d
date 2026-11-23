import { create } from 'zustand'

export type EngineStatus = 'loading' | 'ready' | 'fallback'

export const useApp = create<{
  engine: EngineStatus
  thinking: boolean
  dialog: boolean
  set(p: Partial<{ engine: EngineStatus; thinking: boolean; dialog: boolean }>): void
}>(set => ({ engine: 'loading', thinking: false, dialog: true, set }))
