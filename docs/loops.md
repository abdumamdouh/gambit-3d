# Gambit 3D — Loops

Based on `~/Desktop/abdulrahmans-agents-mcps-skills-workflows/docs/LOOP_ENGINEERING_GUIDE.md`.
Every loop has: a measured check, an explicit turn cap, a fresh-context reviewer, and positive-signal closing.

## ① Planning loop (done for v1)
R0 discovery → R1 spec → R2 blueprint → R3 spikes (look prototype, Qwen test) → R4 red team → R5 visual plan page.
Gate: owner approval ☎. Output: `docs/superpowers/specs/`, plan page in `~/Desktop/artifacts/gambit-3d/plan/`.

## ② Build loop — `/implement-feature-loop GOAL.md`
Per backlog row: investigate → TDD implement → static gate → `code-review` (fresh agent) → browser e2e → accept.
- Gate commands: `npm run lint`, `npm test`, `npm run build`.
- Stop: backlog drained. Cap: 12 items per run, 2 passes per item.
- Failed item → `needs human review`, re-queued at the end of the run.
- Pilot: first run with `maxItems 2`.

## ③ Visual QA loop
Per screen: screenshot 1280×800 and 390×844 → design critique (fresh agent) → fix → re-shoot.
- Measured checks: 0 console errors, FPS ≥ 50 on desktop (sampled 5 s), no HUD overlap at 390 px.
- Stop: 0 open findings, confirmed by critique AND screenshot diff. Cap: 4 rounds.
- Browser agents run one at a time (one shared tab).

## ④ Content loop (M3, M4)
Draft lesson/puzzle set → `scripts/check-content.mjs` (FEN valid, solution legal, solution = Stockfish best at depth 18) → fix or drop.
- Stop: 100% pass. Cap: 3 rounds. Dropped items listed in the run log, never silently.

## After each milestone
`git push` → `vercel deploy` (preview) → owner plays it → "ship" → `vercel deploy --prod` → vault session log → WhatsApp update.
Same mistake twice → add it to a checklist in this file.

## Checklist (grows over time)
- Inline `//` comments in one-line JS blocks cut the line. Use `/* */`. (look prototype, 2026-11-23)
- Bloom + strong spot light overexposes ivory. Keep spot ≤ 20, bloom threshold ≥ 0.95. (look prototype, 2026-11-23)
