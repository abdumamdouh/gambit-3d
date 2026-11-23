import type { PlyReview } from './review'

const URL = 'http://localhost:1234/v1/chat/completions'
const MODEL = 'qwen3.8-27b-mlx'
const MOVE = /\b(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)(?![a-z0-9])/g
const strip = (s: string) => s.replace(/[+#]+$/, '')

/** True when every move or square in the text comes from the engine facts (spec §8). */
export function onlyKnownMoves(text: string, sans: string[], squares: string[]): boolean {
  const okSan = new Set(sans.map(strip))
  const okSq = new Set(squares)
  for (const m of text.matchAll(MOVE)) {
    const t = strip(m[0])
    if (/^[a-h][1-8]$/.test(t) ? !okSq.has(t) && !okSan.has(t) : !okSan.has(t)) return false
  }
  return true
}

/** Ask the local Qwen (LM Studio) to explain a move. Returns null on any failure or unsafe answer. */
export async function qwenExplain(p: PlyReview, uciPv: string[]): Promise<string | null> {
  const sans = [p.san, p.bestSan, ...p.pvSan].filter(Boolean) as string[]
  const squares = [p.from, p.to, p.best?.from, p.best?.to, ...uciPv.slice(0, 3).flatMap(u => [u.slice(0, 2), u.slice(2, 4)])].filter(Boolean) as string[]
  const facts = [
    `Student (${p.color === 'w' ? 'White' : 'Black'}) played ${p.san}. Engine label: ${p.label}.`,
    p.bestSan && p.bestSan !== p.san ? `Engine best move was ${p.bestSan}.` : '',
    p.pvSan.length ? `Opponent's best reply line: ${p.pvSan.join(' ')}.` : '',
    p.captured ? `After the move, the opponent can capture the ${p.captured}.` : '',
    p.mateIn ? `Mate in ${p.mateIn} is involved (${p.tags.includes('missedMate') ? 'the student missed it' : 'the student allowed it'}).` : '',
  ].filter(Boolean).join(' ')
  const text = await askQwen('You are a warm chess coach for a beginner. Answer in at most 3 short sentences. Use ONLY the moves and squares given in the facts. Never name any other move or square. End with one simple rule the student can remember.', facts, 160)
  return text && onlyKnownMoves(text, sans, squares) ? text : null
}

/** One chat turn with LM Studio. Thinking is skipped by prefilling an empty think block. */
export async function askQwen(system: string, user: string, maxTokens: number): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 30000)
  try {
    const r = await fetch(URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
          { role: 'assistant', content: '<think>\n\n</think>\n\n' },
        ],
      }),
    })
    if (!r.ok) return null
    const j = await r.json()
    return String(j.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}
