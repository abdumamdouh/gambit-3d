import { useCoach } from '../coach/coach-store'
import { useReview } from '../coach/review-store'
import { explain } from '../coach/review'
import { useTrain } from '../train/session'
import { useGame } from '../game/store'
import { useSettings } from './settings'

const P: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' }
const SAN = /\b(O-O-O|O-O|([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?)([+#])?/g

/** Plain words for speech: SAN → "knight takes f7, check", no HTML or emoji. */
export function speakable(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/\uFE0F/g, '')
    .replace(SAN, (all, castle: string, piece: string, file: string, _rank: string, take: string, to: string, promo: string, mark: string) => {
      let s = castle === 'O-O-O' ? 'castles long' : castle === 'O-O' ? 'castles' : `${piece ? P[piece] + ' ' : ''}${take ? `${piece ? '' : file + ' '}takes ` : ''}${to}${promo ? ` promotes to ${P[promo]}` : ''}`
      if (mark === '+') s += ', check'
      if (mark === '#') s += ', checkmate'
      return all ? s : all
    })
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function say(text: string) {
  if (!useSettings.getState().voice || typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(speakable(text))
  u.rate = 1.02
  speechSynthesis.speak(u)
}

/** Read coach events aloud when the voice coach is on. */
export function initVoice() {
  useCoach.subscribe((s, p) => {
    if (s.hint && s.hint !== p.hint && s.hint.san) say(`Hint: try ${s.hint.san}.`)
    if (s.guard && s.guard !== p.guard) say(`Wait. ${s.guard.san} drops your winning chances by about ${s.guard.lossPct} percent. Look again.`)
  })
  useTrain.subscribe((s, p) => {
    if (s.drill && s.drill !== p.drill) say(s.drill.text)
    else if (s.note && s.note !== p.note) say(s.note)
  })
  useReview.subscribe((s, p) => {
    if (s.status === 'done' && s.open && (s.index !== p.index || p.status !== 'done')) {
      const ply = s.plies[s.index]
      if (ply) say(explain(ply))
    }
  })
  useGame.subscribe((s, p) => {
    if (!s.result.over || p.result.over || s.mode === 'drill') return
    say(s.result.winner == null ? 'The game is a draw.' : s.result.winner === s.playerColor ? 'You win! Well played.' : 'You lost this one. Let us review it.')
  })
}
