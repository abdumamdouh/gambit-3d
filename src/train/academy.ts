import type { Drill } from './drill'

export interface Stage { id: number; title: string; icon: string; blurb: string; lessons: Drill[] }

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const STAGES: Stage[] = [
  {
    id: 1, title: 'The pieces', icon: '♟', blurb: 'How every piece moves and captures.',
    lessons: [
      { id: 's1-rook', title: 'Rook', text: 'The rook slides in straight lines: up, down, left, right. Capture the pawn.', fen: 'k7/8/8/3p4/8/8/8/3RK3 w - - 0 1', solution: ['d1d5'] },
      { id: 's1-bishop', title: 'Bishop', text: 'The bishop slides diagonally and stays on one colour. Capture the pawn.', fen: 'k7/8/8/8/8/5p2/8/3BK3 w - - 0 1', solution: ['d1f3'] },
      { id: 's1-knight', title: 'Knight', text: 'The knight jumps in an L: two squares one way, one square to the side. Capture the pawn.', fen: 'k7/8/8/8/4p3/8/3N4/4K3 w - - 0 1', solution: ['d2e4'] },
      { id: 's1-queen', title: 'Queen', text: 'The queen moves like a rook and a bishop together. Capture the pawn far away.', fen: 'k7/8/8/8/p7/8/8/3QK3 w - - 0 1', solution: ['d1a4'] },
      { id: 's1-king', title: 'King', text: 'The king moves one square in any direction. The pawn is checking you — capture it!', fen: 'k7/8/8/8/8/8/3p4/4K3 w - - 0 1', solution: ['e1d2'] },
      { id: 's1-pawn', title: 'Pawn', text: 'Pawns move straight forward but capture diagonally. Capture the black pawn.', fen: 'k7/8/8/8/3p4/4P3/8/4K3 w - - 0 1', solution: ['e3d4'] },
    ],
  },
  {
    id: 2, title: 'Special rules', icon: '⚖', blurb: 'Check, castling, en passant, promotion.',
    lessons: [
      { id: 's2-check', title: 'Escape check', text: 'Your king is in check from the queen. The best escape here: capture the checking piece.', fen: 'k7/8/8/8/8/8/3q4/3RK3 w - - 0 1', solution: ['e1d2|d1d2'] },
      { id: 's2-castle', title: 'Castling', text: 'Castling moves the king two squares toward a rook, and the rook jumps over. Castle short: drag the king to g1.', fen: 'r3k3/8/8/8/8/8/8/4K2R w K - 0 1', solution: ['e1g1'] },
      { id: 's2-ep', title: 'En passant', text: 'Black just moved the pawn e7–e5, right past your d5 pawn. You may capture it "in passing" — onto e6.', fen: 'k7/8/8/3Pp3/8/8/8/4K3 w - e6 0 1', solution: ['d5e6'] },
      { id: 's2-promo', title: 'Promotion', text: 'A pawn that reaches the last rank becomes a new piece. Promote to a queen.', fen: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1', solution: ['e7e8q'] },
    ],
  },
  {
    id: 3, title: 'Checkmate patterns', icon: '♚', blurb: 'The mates every player must know.',
    lessons: [
      { id: 's3-backrank', title: 'Back-rank mate', text: 'The black king is trapped behind its own pawns. Mate in 1.', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', solution: ['a1a8'], goal: 'mate' },
      { id: 's3-queen', title: 'Queen + king', text: 'Your king guards the escape squares. Mate in 1 with the queen.', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', solution: ['h1h8'], goal: 'mate' },
      { id: 's3-ladder', title: 'Rook ladder', text: 'One rook guards the 7th rank. Use the other for mate on the 8th.', fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', solution: ['b1b8'], goal: 'mate' },
      { id: 's3-smother', title: 'Smothered mate', text: 'The king is blocked by its own pieces. A knight check is mate.', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', solution: ['h6f7'], goal: 'mate' },
      { id: 's3-kq', title: 'Practice: K+Q vs K', text: 'Push the king to the edge with your queen, bring your king closer, then mate. Stockfish defends. Mate within 25 moves.', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', solution: [], goal: 'practice-mate', maxMoves: 25 },
      { id: 's3-kr', title: 'Practice: K+R vs K', text: 'Cut the king off with the rook, walk your king up, and mate on the edge. Mate within 40 moves.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', solution: [], goal: 'practice-mate', maxMoves: 40 },
    ],
  },
  {
    id: 4, title: 'Tactics', icon: '⚔', blurb: 'Forks, skewers, discovered attacks.',
    lessons: [
      { id: 's4-fork', title: 'Knight fork', text: 'Attack two pieces at once. Find the knight check that also hits the rook.', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', solution: ['d5c7', 'e8d7', 'c7a8'], comments: ['Check! The knight attacks king and rook.', '', 'You won the rook.'] },
      { id: 's4-double', title: 'Queen double attack', text: 'Give a check that also attacks the rook in the corner.', fen: 'r3k3/8/8/8/8/8/8/3QK3 w - - 0 1', solution: ['d1a4', 'e8e7', 'a4a8'], comments: ['Check on the diagonal, attack on the file.', '', 'The rook falls.'] },
      { id: 's4-skewer', title: 'Skewer', text: 'Check the king; when it steps away, the queen behind it is yours.', fen: '4q3/8/8/4k3/8/8/8/R6K w - - 0 1', solution: ['a1e1', 'e5d6', 'e1e8'], comments: ['Check along the e-file.', '', 'Skewered!'] },
      { id: 's4-disc', title: 'Discovered attack', text: 'Move the bishop out of the rook\'s way: it takes the queen and uncovers check.', fen: 'q3k3/8/8/8/4B3/8/8/4RK2 w - - 0 1', solution: ['e4a8'] },
    ],
  },
  {
    id: 5, title: 'Openings', icon: '📖', blurb: 'Principles and 5 openings to start with.',
    lessons: [
      { id: 's5-italian', title: 'Italian Game (White)', text: 'Principles: control the centre, develop knights and bishops, castle early. Play the Italian.', fen: START, solution: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4'], comments: ['Take the centre.', '', 'Develop and attack e5.', '', 'Bishop aims at f7, the weak point.', '', 'Prepare d4.', '', 'Strike the centre!'] },
      { id: 's5-qg', title: "Queen's Gambit (White)", text: 'Offer a pawn to win the centre.', fen: START, solution: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'f8e7', 'e2e3'], comments: ['Centre pawn.', '', 'The gambit: challenge d5.', '', 'Develop, pressure d5.', '', 'Pin the knight.', '', 'Solid: open the bishop.'] },
      { id: 's5-london', title: 'London System (White)', text: 'A simple, solid setup you can play against almost anything.', fen: START, solution: ['d2d4', 'd7d5', 'c1f4', 'g8f6', 'e2e3', 'e7e6', 'g1f3', 'c7c5', 'c2c3'], comments: ['Centre.', '', 'Bishop out first, before e3.', '', 'Support d4.', '', 'Develop.', '', 'Keep d4 strong.'] },
      { id: 's5-sicilian', title: 'Sicilian Defence (Black)', text: 'Fight for the centre from the side. You play Black.', fen: START, playerColor: 'b', solution: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'], comments: ['', 'Control d4 from the side.', '', 'Guard e5, open the bishop.', '', 'Trade a wing pawn for a centre pawn.', '', 'Develop with tempo on e4.', '', 'The Najdorf: control b5.'] },
      { id: 's5-french', title: 'French Defence (Black)', text: 'A solid pawn chain. You play Black.', fen: START, playerColor: 'b', solution: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'c1g5', 'f8e7'], comments: ['', 'Prepare d5.', '', 'Challenge the centre.', '', 'Develop, attack e4.', '', 'Break the pin.'] },
    ],
  },
  {
    id: 6, title: 'Graduation', icon: '🎓', blurb: 'Win real games against Stockfish.',
    lessons: [
      { id: 's6-l2', title: 'Beat level 2', text: 'Use everything you learned. Win a game against Stockfish level 2.', fen: START, solution: [], goal: 'game', level: 2 },
      { id: 's6-l3', title: 'Beat level 3', text: 'Now level 3. Castle early, watch for hanging pieces.', fen: START, solution: [], goal: 'game', level: 3 },
      { id: 's6-l4', title: 'Beat level 4', text: 'Club strength. Use the review after each game.', fen: START, solution: [], goal: 'game', level: 4 },
    ],
  },
]

/** One drill per stage boundary; score n unlocks stages 1..n+1. */
export const PLACEMENT: Drill[] = [
  { ...STAGES[0].lessons[2], id: 'pt-1', title: 'Question 1 of 5' },
  { ...STAGES[1].lessons[1], id: 'pt-2', title: 'Question 2 of 5' },
  { ...STAGES[2].lessons[0], id: 'pt-3', title: 'Question 3 of 5' },
  { ...STAGES[3].lessons[0], id: 'pt-4', title: 'Question 4 of 5' },
  { ...STAGES[3].lessons[2], id: 'pt-5', title: 'Question 5 of 5' },
]

export const allLessons = () => STAGES.flatMap(s => s.lessons)
