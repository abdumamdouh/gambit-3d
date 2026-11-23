# Gambit 3D — LinkedIn demo video plan (Dolly)

Status: **plan, waiting for approval** · 2026-11-23

## Goal
One short, catchy video for a LinkedIn post: "I built a 3D chess game that teaches me — with Claude, in one day."
Watchers must get the wow (3D look) in the first 3 seconds and the "it teaches you" idea by second 15.

## Format
| Item | Choice | Why |
|---|---|---|
| Length | **60–70 s** | LinkedIn completion drops after ~60 s |
| Shape | **1:1 square 1080×1080** (Dolly `--profile square`) + a 16:9 copy for YouTube/portfolio | Square fills the feed on mobile and desktop |
| Voice | Dolly local TTS, `--voice male`, `--tone confident` (or your own voice later) | Free, no cloud |
| Captions | `--captions burned-karaoke` | ~80% watch muted on LinkedIn |
| Music | `--music auto` (calm-tech mood), ducked under the voice | |
| Zoom | `--zoom cinematic`, only on 3 key beats | Emphasis, not spam |
| Brand | `--brand auto` (gold #e2b45c on dark, Fraunces + Inter) | Matches the app |

## Storyboard (beats, ~65 s)
| # | Time | Picture | Narration (draft) |
|---|---|---|---|
| 1 HOOK | 0–4 s | Cinematic camera fly-in over the obsidian & gold board, **zoom** | "I wanted to get better at chess. So I built a coach — in 3D." |
| 2 | 4–12 s | Play e4; Stockfish answers; piece arcs; eval bar moves | "Play Stockfish at eight levels, right in the browser. Every rule, every move." |
| 3 | 12–20 s | Click a hanging-queen move → "⚠ Are you sure?" modal, **zoom** | "It stops my blunders before I make them…" |
| 4 | 20–28 s | 💡 Hint → teal arrow on the board | "…and shows me the better move." |
| 5 | 28–38 s | Game ends → review: ★ best / ?? blunder chips, explanation | "After every game it explains my mistakes in plain words." |
| 6 | 38–47 s | 🧠 My Coach: weakness cards → "Train my weaknesses", own position drill, **zoom** | "It learns my style across games, and turns my own mistakes into lessons." |
| 7 | 47–55 s | Quick cuts: Academy stages · Lichess puzzle · Style switch Walnut → Crystal → Neon | "Lessons, real puzzles, four looks." |
| 8 | 55–62 s | Phone-size frame, offline badge, "Install" | "Free. Works offline. Even on my phone." |
| 9 END | 62–66 s | Logo card + URL `gambit-3d-chess.vercel.app` | "Link in the comments." |

Rules: strongest picture first (beat 1), one idea per beat, ≤ 15 words per narration line.

## How we record it (technical)
Dolly drives pages by **CSS selector** only (click/hover/fill/key/scroll/wait) — it cannot click squares on a 3D canvas.
So we add a small **demo mode** to the app (one file, ~80 lines, no effect on normal use):

- `?demo=1` → hides cursor-noise, clears saved data, seeds 3 sample games (so My Coach has content), and renders
  invisible buttons `#demo-1 … #demo-9`.
- Each button plays one scripted beat (camera move, `e4`, the blunder attempt, hint, a scripted mate, open My Coach…).
- Dolly's beats file clicks `#demo-N`, then waits for the narration.

Pipeline:
```bash
# 1) record (16:9 master), hand-written beats, local voice
./.venv/bin/python dolly.py "https://gambit-3d-chess.vercel.app/?demo=1" \
  --beats ~/Desktop/gambit-3d/docs/video/gambit.beats.yaml \
  --voice male --tone confident --zoom cinematic --captions burned-karaoke --music auto \
  --brand auto --record-mode openscreen --fps 60 --out ~/Desktop/gambit-3d-demo.mp4

# 2) cut for LinkedIn (square) + keep the 16:9
./.venv/bin/python dolly.py post ~/Desktop/gambit-3d-demo.mp4 \
  --beats ~/Desktop/gambit-3d/docs/video/gambit.beats.yaml --style ad --music auto --power medium \
  --profile square
```
Record with `openscreen` (retina, real GPU) — headless rendering is software-only and would look choppy.

## LinkedIn post (draft — you post it yourself)
> I wanted to get better at chess, so I built my own coach. ♟️
> Gambit 3D: a cinematic 3D board, Stockfish at 8 levels, a blunder guard, game reviews that explain my mistakes, and a coach that learns my style and turns my own mistakes into lessons. Free, open source, works offline.
> Built in one day with Claude Code — from idea to tested, deployed app.
> 🎮 Play: link in comments · 💻 Code: github.com/abdumamdouh/gambit-3d
> #chess #webdev #threejs #ai #buildinpublic

## Steps & estimates
1. Demo mode in the app + e2e check — ~45 min
2. Write `gambit.beats.yaml` (9 beats) — ~15 min
3. Record + post-produce with Dolly; review cut — ~30–40 min (mostly render time)
4. You watch it; we adjust 1–2 beats — ~15 min
5. You post on LinkedIn (I never post for you)

## Open choices for you
- Voice: Dolly TTS (fast) or your own voice-over (more personal)?
- Square only, or also a 9:16 cut for Reels/Shorts?
