import { useGame } from '../game/store'
import { useTrain } from '../train/session'
import { useSettings } from './settings'

// ponytail: synthesized with WebAudio — no audio files to load or license.
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new AudioContext())

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, at = 0) {
  const c = ac(), t = c.currentTime + at
  const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur)
}
function knock(gain: number, freq: number) {
  const c = ac(), t = c.currentTime, n = c.sampleRate * 0.06
  const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; g.gain.value = gain
  s.connect(f).connect(g).connect(c.destination); s.start(t)
}

export const SFX = {
  move: () => knock(0.9, 900),
  capture: () => { knock(1.2, 500); tone(140, 0.12, 'triangle', 0.08) },
  check: () => { tone(880, 0.12, 'sine', 0.08); tone(1175, 0.18, 'sine', 0.07, 0.1) },
  end: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'sine', 0.07, i * 0.12)),
  wrong: () => tone(160, 0.25, 'sawtooth', 0.05),
  solved: () => [659, 784, 988].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.09)),
}

/** Subscribe once: sounds follow game and training state. */
export function initSound() {
  const on = () => useSettings.getState().sound
  useGame.subscribe((s, p) => {
    if (!on()) return
    if (s.history.length > p.history.length) {
      const m = s.history[s.history.length - 1]
      if (m.san.includes('+') || m.san.includes('#')) SFX.check()
      else if (m.captured) SFX.capture()
      else SFX.move()
    }
    if (s.result.over && !p.result.over) setTimeout(SFX.end, 250)
  })
  useTrain.subscribe((s, p) => {
    if (!on() || s.status === p.status) return
    if (s.status === 'solved') SFX.solved()
    if (s.status === 'wrong' || s.status === 'failed') SFX.wrong()
  })
}
