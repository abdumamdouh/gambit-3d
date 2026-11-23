# Gambit 3D — Design Spec

Date: 2026-11-23 · Status: approved (design v2) · Owner: Abdulrahman
Visual plan: `~/Desktop/artifacts/gambit-3d/plan/index.html` · Look reference: `~/Desktop/artifacts/gambit-3d/look/index.html`

## 1. Goal

A cinematic 3D chess web app that teaches the player. The player is a beginner who knows the moves and a little tactics. The app must:

- play full-rules chess against an engine at chosen strength,
- coach during and after games,
- teach from basics to tactics and openings,
- measure skill per game and show the trend over time,
- let the player play real people online,
- cost $0 to run.

## 2. Non-goals (v1)

- Accounts, cloud sync, backend servers.
- Paid or hosted LLMs.
- Bullet/blitz online play (Lichess Board API limits).
- Variants (960, crazyhouse).

## 3. Stack

| Concern | Choice |
|---|---|
| App | Vite + React 19 + TypeScript |
| 3D | three.js via @react-three/fiber 9, drei 10, @react-three/postprocessing 3 |
| Rules | chess.js 1.4 (single source of truth for legality) |
| State | zustand 5 |
| Engine | Stockfish 17.1 lite single-thread WASM in a Web Worker (`public/engine/`, copied from `node_modules/stockfish` by `scripts/copy-engine.mjs`) |
| LLM coach | Local Qwen3.8 27B via LM Studio OpenAI API at `http://localhost:1234` (optional) |
| Storage | IndexedDB (progress, games) + JSON export/import |
| Tests | Vitest (logic), Playwright via browser MCP (smoke, visual) |
| Hosting | Vercel Hobby via `vercel` CLI; GitHub `abdumamdouh/gambit-3d` (public) |
| License | GPL-3.0 (Stockfish is GPL) |

## 4. Architecture

```
src/
  game/      zustand store: chess.js instance, history, mode, clocks, undo, result
  engine/    Worker wrapper: UCI protocol, levels, bestMove(), analyse()
  scene/     R3F: Board, Pieces (procedural lathe + extruded knight), CameraRig, Markers, Effects
  coach/     (M2) move classification, blunder guard, explanations, Qwen client
  progress/  (M2) skill report, IndexedDB, trends
  academy/   (M3) lessons
  tactics/   (M4) puzzles, rating, spaced repetition
  online/    (M5) Lichess Board API client, P2P invite
  ui/        HUD, screens, menus
```

Rules for boundaries:
- `scene/` never decides legality. It asks the store for legal moves and calls `store.move()`.
- `engine/` is UI-free. It returns typed results (`{ bestMove, scoreCp | mate, pv }`).
- `game/` owns the only `Chess` instance. Everything else reads FEN/history from it.

### Data flow (one move)
1. Player clicks a piece → `scene` asks `store.legalMoves(square)` → markers render.
2. Player clicks target → `store.move({from,to,promotion})` → chess.js validates → state updates.
3. `scene` animates the diff (from → to, captures, castling rook, en passant, promotion).
4. If it is the engine's turn, `store` calls `engine.bestMove(fen, level)` → `store.move()`.

### Error handling
- Engine worker fails to load → show banner, fall back to a capture-preferring random bot.
- WebGL unavailable → message with a link to a 2D fallback (M6).
- Corrupt saved data → reset only the broken key, keep the rest.
- LM Studio not reachable → coach uses template text, no error shown.

## 5. Engine levels

8 levels using UCI `Skill Level` + `movetime`, plus `UCI_LimitStrength`/`UCI_Elo` where valid (Elo ≥ 1320):

| Level | Label | Settings |
|---|---|---|
| 1 | ~400 | Skill 0, depth 1, 30% random legal move |
| 2 | ~700 | Skill 2, depth 2 |
| 3 | ~1000 | Skill 5, depth 4 |
| 4 | ~1320 | UCI_Elo 1320, 200 ms |
| 5 | ~1600 | UCI_Elo 1600, 300 ms |
| 6 | ~1900 | UCI_Elo 1900, 500 ms |
| 7 | ~2300 | UCI_Elo 2300, 800 ms |
| 8 | Max | full strength, 1500 ms |

## 6. Milestones

- **M1 Play** — 3D board (look prototype quality), all rules, promotion picker, engine levels 1–8, clocks, 4 camera presets, undo, new game, result screen, move list.
- **M2 Coach + Progress** — eval bar, hint, blunder guard, post-game review with labels and 3D arrows, explanations (templates + optional Qwen), Skill Report, progress dashboard and weekly verdict.
- **M3 Academy** — placement test, 6 stages (pieces, rules, mates, tactics, openings, play), XP.
- **M4 Tactics** — ~3,000 Lichess puzzles by theme, puzzle rating (Glicko-lite), spaced repetition, daily puzzle.
- **M5 Online** — Lichess OAuth (PKCE) + Board API on our board; P2P friend link (WebRTC via PeerJS public broker).
- **M6 Polish** — themes, sounds, PGN import/export, mobile touch, quality presets, 2D fallback.

Each milestone ships to Vercel and works alone.

## 7. Progress score (M2)

Per game: accuracy % (Lichess-style win-probability formula), counts of best/good/inaccuracy/mistake/blunder (thresholds on win-probability loss: 0.05/0.10/0.20), phase scores, tactics spotted vs missed, time per move.
Skills 0–100: piece safety, development & king safety, tactics vision, endgame technique, calculation.
Trend: estimated rating, skill radar now vs 30 days ago, weekly verdict (improving if 7-day accuracy average rises ≥ 2 points, dropping if falls ≥ 2, else flat).

## 8. LLM coach safety

Qwen receives only engine facts (FEN, played move, best move, PV, eval delta, tags). Prompt forbids new moves. A post-check extracts SAN tokens from the answer; any token not in the provided lines → discard answer, use template. Thinking is disabled by prefilling an empty `<think></think>` block (measured 4 s/answer on M5 Pro).

## 9. Testing

- Vitest: store (all special moves, draws, undo), engine UCI parsing and level mapping, coach classification thresholds, progress math.
- Content check (M3/M4): every lesson/puzzle FEN valid, every solution legal and engine-best.
- Browser smoke per milestone: page loads, 0 console errors, one full move pair vs engine, screenshots at 1280×800 and 390×844.

## 10. Loops

See `docs/loops.md`. Backlog lives in `GOAL.md`.
