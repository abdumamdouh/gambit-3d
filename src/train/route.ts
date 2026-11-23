import { useGame } from '../game/store'
import { guardedMove } from '../coach/actions'
import { drillMove } from './session'
import { onlineMove } from '../online/session'

/** Every player move goes through here, so each mode applies its own rules. */
export function playerMove(from: string, to: string, promotion?: string) {
  const g = useGame.getState()
  if (g.mode === 'drill') return void drillMove(from, to, promotion)
  if (g.mode === 'online') return void onlineMove(from, to, promotion)
  if (promotion) return void g.move({ from, to, promotion })
  if (g.mode === 'practice') return void g.tryMove(from, to)
  return void guardedMove(from, to)
}
