import { describe, it, expect } from 'vitest'
import { judge, firstPlayerStep, type Drill } from './drill'

const fork: Drill = { id: 'f', title: '', text: '', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', solution: ['d5c7', 'e8d7', 'c7a8'] }
const mate: Drill = { id: 'm', title: '', text: '', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', solution: ['h1h8'], goal: 'mate' }

describe('judge', () => {
  it('first right move of a line is correct', () => expect(judge(fork, 0, fork.fen, { from: 'd5', to: 'c7' })).toBe('correct'))
  it('last right move solves', () => expect(judge(fork, 2, '', { from: 'c7', to: 'a8' })).toBe('solved'))
  it('a wrong move is wrong', () => expect(judge(fork, 0, fork.fen, { from: 'd5', to: 'e7' })).toBe('wrong'))
  it('alternatives with |', () => {
    const d: Drill = { ...fork, solution: ['d5c7|d5f6'] }
    expect(judge(d, 0, d.fen, { from: 'd5', to: 'f6' })).toBe('solved')
  })
  it('any mating move solves', () => expect(judge(mate, 0, mate.fen, { from: 'h1', to: 'h8' })).toBe('solved'))
  it('an alternative mate also solves', () => {
    const d: Drill = { ...mate, fen: 'k7/8/1K6/8/8/8/8/6QQ w - - 0 1', solution: ['h1h8'] }
    expect(judge(d, 0, d.fen, { from: 'g1', to: 'g8' })).toBe('solved')
  })
  it('promotion must match', () => {
    const d: Drill = { id: 'p', title: '', text: '', fen: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1', solution: ['e7e8q'] }
    expect(judge(d, 0, d.fen, { from: 'e7', to: 'e8', promotion: 'n' })).toBe('wrong')
    expect(judge(d, 0, d.fen, { from: 'e7', to: 'e8', promotion: 'q' })).toBe('solved')
  })
  it('black opening: player starts at step 1, ends on own last move', () => {
    const d: Drill = { id: 's', title: '', text: '', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', playerColor: 'b', solution: ['e2e4', 'c7c5', 'g1f3', 'd7d6'] }
    expect(firstPlayerStep(d)).toBe(1)
    expect(judge(d, 1, '', { from: 'c7', to: 'c5' })).toBe('correct')
    expect(judge(d, 3, '', { from: 'd7', to: 'd6' })).toBe('solved')
  })
})
