# ♛ Gambit 3D

**Play it:** https://gambit-3d-chess.vercel.app

A cinematic 3D chess game that teaches you. Play Stockfish in a studio-lit 3D scene, learn how every piece moves, and (soon) get coached, track your progress, train tactics and play people online.

## Now (M1 · Play)
- Full rules (castling, en passant, promotion, all draws) via chess.js
- Stockfish 17.1 in your browser, 8 levels (~400 → max)
- Ivory & obsidian pieces, marble board, soft shadows, bloom, gold dust
- 4 cameras: Player, Top, Low angle, Cinematic orbit
- Clocks, undo, resign, piece tips from the coach
- Works on phones

## M2 · Coach + Progress
- Eval bar, 💡 hint arrow, blunder guard ("Are you sure?")
- Automatic game review: best / good / inaccuracy / mistake / blunder, better-move arrows, plain-words explanations
- Optional **local AI coach**: Qwen in LM Studio (`lms server start --cors`), free and private; answers that name moves outside the engine line are dropped
- Progress: Skill Report per game, accuracy chart, skills, rating estimate, weekly verdict, export/import
- 4 board styles: Obsidian & Ivory, Walnut Classic, Crystal, Neon Night · zoom buttons

## M3–M6 · Academy, Tactics, Online, Polish
- 🎓 **Academy**: 5-question placement test, 6 stages (pieces, rules, mates, tactics, openings, graduation), practice K+Q / K+R mates vs Stockfish, XP
- ⚔ **Tactics trainer**: live Lichess puzzles by theme near your rating, puzzle rating, missed puzzles return after 1/3/7 days, daily puzzle + streak
- 🌐 **Online**: play a friend with an invite link (peer-to-peer, no account) or real players on Lichess (sign in with Lichess, casual rapid/classical) — on the 3D board
- ✨ **Polish**: synthesized sounds, PGN export + review any PGN, graphics presets (High / Medium / Low / 2D board), labels face the player
See [`GOAL.md`](GOAL.md) and the [design spec](docs/superpowers/specs/2026-11-23-gambit-3d-design.md).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # production build in dist/
```

## 🧠 My Coach (style analysis + personal lessons)
- Every finished game saves its mistakes (position, your move, Stockfish's move, label, phase), opening and castling move — on your device (IndexedDB)
- A style analyzer reads **all** your games: hanging pieces, missed tactics, allowed mates, blunders, late castling, early queen, weak openings/endgames — with evidence and trend
- A lesson generator turns your own mistake positions into drills ("find the move Stockfish wanted"), and links the matching Academy lessons and puzzle themes
- Optional study-plan letter from your local Qwen (LM Studio). Only summary numbers are sent; any move Qwen names that is not in your data is rejected
- Replay and re-review any saved game from 📈 Progress

## More
- 📖 **Openings vs the masters** (My Coach): your opening moves checked against the Lichess masters database; drill the main moves where you deviate
- 🗣 **Voice coach**: hints, warnings, lessons and review explanations read aloud (Style → Voice coach)
- ⬇ **Install as an app**: works offline after the first visit — Stockfish included
- 📲 **Device sync** (Progress): link two devices; games, lessons and puzzle progress merge both ways, device-to-device, no account
- ⚙ Auto quality: drops graphics a step on slow devices

## Testing
```bash
npm test          # unit tests (vitest)
npm run e2e       # build + Playwright: desktop, phone layout, offline PWA
P2P=1 npx playwright test -g "friend game"   # optional, headed: WebRTC friend game
```
CI (GitHub Actions) runs lint, unit, build and e2e on every push.

## Stack
Vite · React 19 · TypeScript · three.js · React Three Fiber · drei · postprocessing · chess.js · zustand · Stockfish.js

## Credits & license
- [Stockfish](https://stockfishchess.org) / [Stockfish.js](https://github.com/nmrugg/stockfish.js) — GPL-3.0
- [chess.js](https://github.com/jhlywa/chess.js) — BSD-2
- [three.js](https://threejs.org) — MIT

Gambit 3D is licensed under **GPL-3.0** (see `LICENSE`), because it ships Stockfish.
