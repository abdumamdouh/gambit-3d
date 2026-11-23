import { describe, it, expect, beforeEach } from 'vitest'
import { useGame, piecesAt } from './store'

const g = () => useGame.getState()

describe('store', () => {
  beforeEach(() => g().newGame({ color: 'w', level: 3, minutes: 5 }))

  it('new game resets', () => {
    g().tryMove('e2', 'e4')
    g().newGame({ color: 'w', level: 3, minutes: 5 })
    expect(g().history).toHaveLength(0)
    expect(g().pieces.filter(p => !p.captured)).toHaveLength(32)
    expect(g().clock).toEqual({ w: 300000, b: 300000 })
  })
  it('plays a legal move', () => {
    expect(g().tryMove('e2', 'e4')).toBe(true)
    expect(g().history).toHaveLength(1)
    expect(g().lastMove).toEqual({ from: 'e2', to: 'e4' })
  })
  it('rejects an illegal move', () => {
    expect(g().tryMove('e2', 'e5')).toBe(false)
    expect(g().history).toHaveLength(0)
  })
  it('opens the promotion picker, then promotes to the chosen piece', () => {
    g().loadFen('8/P7/8/8/8/8/8/k6K w - - 0 1')
    expect(g().tryMove('a7', 'a8')).toBe(true)
    expect(g().pendingPromotion).toEqual({ from: 'a7', to: 'a8' })
    expect(g().history).toHaveLength(0)
    g().move({ from: 'a7', to: 'a8', promotion: 'n' })
    expect(g().pendingPromotion).toBeNull()
    expect(g().pieces.find(p => p.square === 'a8')!.type).toBe('n')
  })
  it('undo returns to the player turn with stable ids', () => {
    const id = g().pieces.find(p => p.square === 'e2')!.id
    g().tryMove('e2', 'e4'); g().move({ from: 'e7', to: 'e5' })
    g().undo()
    expect(g().history).toHaveLength(0)
    expect(g().pieces.find(p => p.square === 'e2')!.id).toBe(id)
  })
  it('undo after only the player move goes back one ply', () => {
    g().tryMove('e2', 'e4')
    g().undo()
    expect(g().history).toHaveLength(0)
  })
  it('flags on time', () => {
    g().tryMove('e2', 'e4')
    g().tick(400000)
    expect(g().result).toEqual({ over: true, reason: 'timeout', winner: 'w' })
  })
  it('clock does not run before the first move', () => {
    g().tick(1000)
    expect(g().clock.w).toBe(300000)
  })
  it('resign ends the game', () => {
    g().resign()
    expect(g().result).toEqual({ over: true, reason: 'resign', winner: 'b' })
  })
  it('blocks moves after game over', () => {
    g().resign()
    expect(g().tryMove('e2', 'e4')).toBe(false)
  })
})

describe('modes and start positions', () => {
  it('newGame is a normal game', () => {
    g().newGame({ color: 'w', level: 3, minutes: null })
    expect(g().mode).toBe('game')
  })
  it('loadFen sets drill mode, player = side to move, and a start fen', () => {
    g().loadFen('4k3/8/8/8/8/8/8/R3K3 b - - 0 1')
    expect(g().mode).toBe('drill')
    expect(g().playerColor).toBe('b')
    expect(g().startFen).toBe('4k3/8/8/8/8/8/8/R3K3 b - - 0 1')
  })
  it('undo from a loaded position goes back to that position', () => {
    g().loadFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'practice')
    g().move({ from: 'a1', to: 'a7' })
    g().move({ from: 'e8', to: 'd8' })
    g().undo()
    expect(g().fen).toBe('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')
    expect(g().pieces.find(p => p.square === 'a1')?.type).toBe('r')
  })
  it('piecesAt replays from the start fen', () => {
    g().loadFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')
    g().move({ from: 'a1', to: 'a7' })
    expect(piecesAt(g().history, 0, g().startFen).find(p => p.type === 'r')?.square).toBe('a1')
  })
})
