# M2 Coach + Progress — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Eval bar, hint arrow, blunder guard, post-game review with labels + explanations (templates, optional local Qwen), Skill Report saved per game, progress dashboard with weekly verdict. Plus zoom buttons (owner request).

**Spec:** `docs/superpowers/specs/2026-11-23-gambit-3d-design.md` §6–§8 · Backlog rows 2–4 in `GOAL.md`.

## Global Constraints
- Win% = 50 + 50·(2/(1+e^(−0.00368208·cp)) − 1); mate → 100/0. Accuracy/move = 103.1668·e^(−0.04354·Δwin%) − 3.1669, clamped 0–100.
- Labels by win-probability loss (0–1): ≥0.20 blunder, ≥0.10 mistake, ≥0.05 inaccuracy; equal to engine best → best; else good.
- Verdict: last-7-days avg accuracy vs previous 7 days: ≥ +2 improving, ≤ −2 dropping, else flat; < 2 games in either window → "not enough games".
- Analysis = full-strength Stockfish, depth 12 (review) / 10 (guard), shared worker queue.
- Qwen: LM Studio `qwen3.8-27b-mlx`, empty `<think></think>` prefill, every SAN token in the answer must be in the provided lines, else template.
- No new dependencies. IndexedDB via a 30-line wrapper.

## Interfaces
```ts
// src/coach/eval.ts
export type Score = { cp?: number; mate?: number }          // white POV
export function winPct(s: Score): number                     // 0..100, white POV
export function moveAccuracy(beforeMover: number, afterMover: number): number
export type Label = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
export function classify(lossFrac: number, isBest: boolean): Label
export function gameAccuracy(accs: number[]): number         // mean, 0 if empty
// src/engine/engine.ts
analyse(fen: string, depth: number): Promise<{ score: Score; bestMove: UciMove | null; pv: string[] }>   // score white POV
// src/coach/review.ts
export interface PlyReview { ply; san; color; before: Score; after: Score; best: string|null; bestSan: string|null; pvSan: string[]; loss; label; accuracy; tags: Tag[] }
export function reviewPly(...): PlyReview                    // pure, from two analyses
export function explain(p: PlyReview, youColor): string       // template text
// src/progress/skills.ts
export interface GameRecord { id; date; color; level; result: 'win'|'loss'|'draw'; accuracy; counts; phases; skills; plies }
export function buildRecord(...): GameRecord
export function verdict(records, now): 'improving'|'flat'|'dropping'|'not-enough'
export function ratingEstimate(records): number | null
```

## Tasks
- [ ] T1 `coach/eval.ts` + tests (win%, accuracy, classify, mate handling). Engine `analyse()` + UCI test for side-to-move → white POV flip.
- [ ] T2 M2a: coach store (eval, hint, guard, settings), `EvalBar`, 3D `Arrow`, hint button, guard modal, zoom +/− (camera dolly, clamped to controls min/max).
- [ ] T3 M2b: `review.ts` (tags: allowsMate, missedMate, hangs, missedWin, positional) + tests; review runner with progress; store `viewPly` + `piecesAt(history, ply)`; review panel (step, label chip, explanation, best-move arrow); `qwen.ts` with SAN post-check + test.
- [ ] T4 M2c: `skills.ts` + tests (record, verdict, rating); `db.ts` IndexedDB; auto-save after review; Progress dashboard (tiles, accuracy line chart SVG, skills now vs 30 days, recent games, export/import).
- [ ] T5 Browser verify (desktop + 375 px), lint/test/build, push, `vercel deploy --prod`, GOAL rows 2–4 → done.
