import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { LEVELS, setupCommands, goCommand } from './levels'
import { parseBestMove, parseInfo } from './uci'
import { fallbackMove } from './fallback'

describe('levels', () => {
  it('has 8 levels, elo never below 1320', () => {
    expect(LEVELS).toHaveLength(8)
    LEVELS.forEach(l => l.elo && expect(l.elo).toBeGreaterThanOrEqual(1320))
  })
  it('level 4 limits strength', () => {
    expect(setupCommands(LEVELS[3])).toContain('setoption name UCI_Elo value 1320')
    expect(setupCommands(LEVELS[3])).toContain('setoption name UCI_LimitStrength value true')
  })
  it('level 8 is full strength', () => {
    expect(setupCommands(LEVELS[7])).toContain('setoption name UCI_LimitStrength value false')
    expect(setupCommands(LEVELS[7])).toContain('setoption name Skill Level value 20')
  })
  it('level 1 uses depth', () => expect(goCommand(LEVELS[0])).toBe('go depth 1'))
  it('level 8 uses movetime', () => expect(goCommand(LEVELS[7])).toBe('go movetime 1500'))
})

describe('uci', () => {
  it('parses bestmove with promotion', () => expect(parseBestMove('bestmove e7e8q ponder a1a2')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' }))
  it('parses plain bestmove', () => expect(parseBestMove('bestmove e2e4')).toEqual({ from: 'e2', to: 'e4' }))
  it('parses bestmove (none)', () => expect(parseBestMove('bestmove (none)')).toBeNull())
  it('ignores other lines', () => expect(parseBestMove('info depth 1')).toBeNull())
  it('parses info cp', () => expect(parseInfo('info depth 12 seldepth 18 score cp -35 nodes 1 pv e2e4 e7e5')).toEqual({ depth: 12, scoreCp: -35, pv: ['e2e4', 'e7e5'] }))
  it('parses info mate', () => expect(parseInfo('info depth 5 score mate 2 pv d1h5')).toEqual({ depth: 5, mate: 2, pv: ['d1h5'] }))
  it('ignores info without score', () => expect(parseInfo('info string NNUE enabled')).toBeNull())
})

describe('fallback', () => {
  it('takes the queen when it can', () => {
    const c = new Chess('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1')
    expect(fallbackMove(c)).toMatchObject({ from: 'e4', to: 'd5' })
  })
  it('returns a legal move', () => {
    const c = new Chess(); const m = fallbackMove(c)
    expect(c.moves({ verbose: true }).some(x => x.from === m.from && x.to === m.to)).toBe(true)
  })
})

import { toWhitePov } from './uci'
describe('toWhitePov', () => {
  it('keeps white-to-move score', () => expect(toWhitePov({ scoreCp: 40, depth: 1, pv: [] }, 'w')).toEqual({ cp: 40 }))
  it('flips black-to-move score', () => expect(toWhitePov({ scoreCp: 40, depth: 1, pv: [] }, 'b')).toEqual({ cp: -40 }))
  it('flips mate', () => expect(toWhitePov({ mate: 2, depth: 1, pv: [] }, 'b')).toEqual({ mate: -2 }))
})
