# Gambit 3D — Backlog

Spec: `docs/superpowers/specs/2026-11-23-gambit-3d-design.md` · Loops: `docs/loops.md`

## Backlog

| # | Item | Status | Branch | Notes |
| - | ---- | ------ | ------ | ----- |
| 1 | M1 Play — 3D board, full rules, engine levels, cameras | done | main | live 2026-11-23: https://gambit-3d-chess.vercel.app |
| 2 | M2a Coach — eval bar, hint, blunder guard | done | main | 2026-11-23, + zoom buttons |
| 3 | M2b Game review — labels, 3D arrows, explanations (templates + Qwen) | done | main | 2026-11-23 |
| 4 | M2c Progress — Skill Report, IndexedDB, dashboard, weekly verdict | done | main | 2026-11-23 |
| 5 | M3 Academy — placement test + 6 stages | done | main | 2026-11-23 |
| 6 | M4 Tactics — puzzles, rating, spaced repetition | done | main | 2026-11-23 |
| 7 | M5a Online — Lichess OAuth + Board API | done | main | 2026-11-23 |
| 8 | M5b Online — P2P friend link | done | main | 2026-11-23 |
| 9 | M6 Polish — themes, sounds, PGN, mobile, presets | done | main | 2026-11-23 |
| 10 | My Coach — style analysis across games, personal drills from own mistakes, Qwen study plan, replay history | done | main | 2026-11-23 (owner request) |

### 2 — M2a Coach
- Eval bar driven by engine `analyse()` (depth 12) after every move; white-bottom, smooth animation.
- Hint button: shows best move as a glowing 3D arrow; counts hints used.
- Blunder guard (toggle): before committing a move, if win-probability loss ≥ 0.20, show "Are you sure?" with Try again / Play anyway.
- Done when: unit tests for win-probability math; browser check shows bar moves after 1.e4 and guard fires on a hanging-queen move.

### 3 — M2b Game review
- After game end: analyse every ply, label best/good/inaccuracy/mistake/blunder (thresholds 0.05/0.10/0.20).
- Review screen: step through moves, 3D arrow for best move, label chip, explanation text.
- Explanations: 12 templates (hanging piece, fork, pin, mate threat, …); optional Qwen via LM Studio with SAN post-check (spec §8).
- Done when: labels unit-tested on fixture PGNs; Qwen off/on both work; no invented SAN passes the check.

### 4 — M2c Progress
- Skill Report per game (spec §7) saved in IndexedDB; export/import JSON.
- Dashboard: accuracy trend, rating estimate, skill radar now vs 30 days, weekly verdict.
- Done when: math unit-tested; dashboard renders with 0, 1 and 30 fake games.

### 5 — M3 Academy
- Placement test (5 puzzles) sets start stage.
- Stages: pieces, rules, mates (K+Q, K+R, ladder), tactics, openings (5 lines), play.
- Content checked by `scripts/check-content.mjs`.

### 6 — M4 Tactics
- ~3,000 CC0 Lichess puzzles bundled as JSON by theme; puzzle rating; missed puzzles return after 1, 3, 7 days; daily puzzle + streak.

### 7 — M5a Online (Lichess)
- OAuth PKCE (no secret), seek rapid/classical, stream game state, send moves; coach disabled in live games.

### 8 — M5b Online (friend)
- Invite link with PeerJS; host is white; moves validated on both sides by chess.js.

### 9 — M6 Polish
- Board/piece themes (obsidian, walnut, glass), sounds, PGN import/export, touch controls, quality presets, 2D fallback.

## Carry-forward

(Findings raised by verifiers on out-of-scope problems. Drained BEFORE new backlog rows.)

- ~~Rank labels upside-down for Black~~ fixed in M6.
- Lichess online play is built but not tested with a real account (needs the owner to sign in).
- Bundle is 392 kB gzip in one chunk; code-split the scene if first paint gets slow.

## Loop log

(One line per iteration, appended by the loop. Never edit by hand.)
