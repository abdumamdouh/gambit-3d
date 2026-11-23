import { describe, it, expect } from 'vitest'
import { challengeFor, ndjsonSplitter, movesToApply } from './lichess'

describe('PKCE', () => {
  it('matches the RFC 7636 example', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('ndjson', () => {
  it('joins split chunks and skips keep-alive blank lines', () => {
    const out: unknown[] = []
    const feed = ndjsonSplitter(o => out.push(o))
    feed('{"a":1}\n\n{"b"')
    feed(':2}\n')
    expect(out).toEqual([{ a: 1 }, { b: 2 }])
  })
})

describe('movesToApply', () => {
  it('returns only the new server moves', () => expect(movesToApply(['e2e4'], 'e2e4 e7e5 g1f3')).toEqual(['e7e5', 'g1f3']))
  it('returns nothing when in sync', () => expect(movesToApply(['e2e4'], 'e2e4')).toEqual([]))
  it('flags a mismatch with null', () => expect(movesToApply(['d2d4'], 'e2e4 e7e5')).toBeNull())
  it('handles an empty game', () => expect(movesToApply([], '')).toEqual([]))
})

import { parseMsg } from './session'
describe('parseMsg (review #6)', () => {
  it('accepts a valid move', () => expect(parseMsg({ t: 'move', uci: 'e7e8q', ply: 3 })).toEqual({ t: 'move', uci: 'e7e8q', ply: 3 }))
  it('rejects a bad uci', () => expect(parseMsg({ t: 'move', uci: 'e2e4; drop', ply: 0 })).toBeNull())
  it('rejects a bad colour', () => expect(parseMsg({ t: 'start', hostColor: 'x' })).toBeNull())
  it('rejects non-objects', () => expect(parseMsg('hi')).toBeNull())
})
