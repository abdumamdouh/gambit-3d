// Copies the Stockfish lite single-thread build into public/engine (GPL-3.0, see LICENSE).
import { mkdirSync, copyFileSync } from 'node:fs'
const src = 'node_modules/stockfish/src/', dst = 'public/engine/'
mkdirSync(dst, { recursive: true })
for (const f of ['stockfish-17.1-lite-single-03e3232.js', 'stockfish-17.1-lite-single-03e3232.wasm']) copyFileSync(src + f, dst + f)
