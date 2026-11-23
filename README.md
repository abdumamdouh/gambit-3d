# ♛ Gambit 3D

A cinematic 3D chess game that teaches you. Play Stockfish in a studio-lit 3D scene, learn how every piece moves, and (soon) get coached, track your progress, train tactics and play people online.

## Now (M1 · Play)
- Full rules (castling, en passant, promotion, all draws) via chess.js
- Stockfish 17.1 in your browser, 8 levels (~400 → max)
- Ivory & obsidian pieces, marble board, soft shadows, bloom, gold dust
- 4 cameras: Player, Top, Low angle, Cinematic orbit
- Clocks, undo, resign, piece tips from the coach
- Works on phones

## Next
Coach + progress score → Academy → Tactics trainer → Online (Lichess + friend link) → Polish.
See [`GOAL.md`](GOAL.md) and the [design spec](docs/superpowers/specs/2026-11-23-gambit-3d-design.md).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # production build in dist/
```

## Stack
Vite · React 19 · TypeScript · three.js · React Three Fiber · drei · postprocessing · chess.js · zustand · Stockfish.js

## Credits & license
- [Stockfish](https://stockfishchess.org) / [Stockfish.js](https://github.com/nmrugg/stockfish.js) — GPL-3.0
- [chess.js](https://github.com/jhlywa/chess.js) — BSD-2
- [three.js](https://threejs.org) — MIT

Gambit 3D is licensed under **GPL-3.0** (see `LICENSE`), because it ships Stockfish.
