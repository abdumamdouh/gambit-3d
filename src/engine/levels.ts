export interface Level { id: number; label: string; skill?: number; elo?: number; depth?: number; movetime?: number; randomness?: number }

// Spec §5. Stockfish 17.1 rejects UCI_Elo below 1320, so levels 1-3 use Skill Level + depth.
export const LEVELS: Level[] = [
  { id: 1, label: 'Beginner · ~400', skill: 0, depth: 1, randomness: 0.3 },
  { id: 2, label: 'Novice · ~700', skill: 2, depth: 2 },
  { id: 3, label: 'Casual · ~1000', skill: 5, depth: 4 },
  { id: 4, label: 'Club · ~1320', elo: 1320, movetime: 200 },
  { id: 5, label: 'Strong club · ~1600', elo: 1600, movetime: 300 },
  { id: 6, label: 'Expert · ~1900', elo: 1900, movetime: 500 },
  { id: 7, label: 'Master · ~2300', elo: 2300, movetime: 800 },
  { id: 8, label: 'Stockfish · Max', skill: 20, movetime: 1500 },
]

export function setupCommands(l: Level): string[] {
  if (l.elo) return ['setoption name Skill Level value 20', 'setoption name UCI_LimitStrength value true', `setoption name UCI_Elo value ${l.elo}`]
  return ['setoption name UCI_LimitStrength value false', `setoption name Skill Level value ${l.skill ?? 20}`]
}

export const goCommand = (l: Level) => (l.depth ? `go depth ${l.depth}` : `go movetime ${l.movetime ?? 1000}`)
