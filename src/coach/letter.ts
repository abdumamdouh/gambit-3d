import type { StyleProfile } from './style'
import { askQwen, onlyKnownMoves } from './qwen'

/** Facts only: numbers and labels from my saved games. No board positions leave this function. */
export function profileFacts(p: StyleProfile): string {
  const w = p.weaknesses.slice(0, 4).map((x, i) => `${i + 1}. ${x.title}: ${x.detail}${x.trend ? ` Trend: ${x.trend}.` : ''}`).join('\n')
  const o = p.openings.map(x => `${x.line} — ${x.games} games, score ${Math.round(x.score * 100)}%, accuracy ${x.accuracy}%`).join('\n')
  return `Games analysed: ${p.games}.\nWeaknesses (worst first):\n${w || 'none'}\nStrengths: ${p.strengths.join(' ') || 'none yet'}\nOpenings played:\n${o || 'none'}`
}

/** Template letter, used when Qwen is off or not running. */
export function templateLetter(p: StyleProfile): string {
  if (!p.games) return 'Finish a few games and I will study them for you.'
  if (!p.weaknesses.length) return `I studied your ${p.games} games and found no big pattern of mistakes. Keep playing at a higher level to find your next challenge.`
  const top = p.weaknesses.slice(0, 3)
  return [`I studied your ${p.games} games. Here is your plan:`, ...top.map((w, i) => `${i + 1}. ${w.title} — ${w.detail}`), p.strengths[0] ? `Good news: ${p.strengths[0]}` : '', 'Start with the drills from your own games below.'].filter(Boolean).join('\n')
}

export async function qwenLetter(p: StyleProfile): Promise<string | null> {
  const text = await askQwen(
    'You are a warm, direct chess coach for a beginner. From the stats, write a personal study plan: 3 numbered priorities (one short sentence each, most important first), then one encouraging sentence. Use only the facts given. Do not name chess moves except moves inside the listed openings.',
    profileFacts(p),
    260,
  )
  const sans = p.openings.flatMap(o => o.line.split(' '))
  return text && onlyKnownMoves(text, sans, []) ? text : null
}
