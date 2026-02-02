import { Chess, type Move, type Square } from "chess.js";

type MoveInput = { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" };

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

function evaluatePosition(chess: Chess): number {
  // Positive = advantage White, Negative = advantage Black
  let score = 0;
  const b = chess.board();
  for (const row of b) {
    for (const p of row) {
      if (!p) continue;
      const v = PIECE_VALUES[p.type] ?? 0;
      score += p.color === "w" ? v : -v;
    }
  }
  // Small mobility bonus
  const mobility = chess.moves().length;
  score += (chess.turn() === "w" ? 1 : -1) * mobility * 0.2;
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number
): number {
  if (depth === 0 || chess.isGameOver()) return evaluatePosition(chess);

  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return evaluatePosition(chess);

  const maximizing = chess.turn() === "w";

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const m of moves) {
    chess.move(m);
    best = Math.min(best, minimax(chess, depth - 1, alpha, beta));
    chess.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

// PUBLIC_INTERFACE
export function getBestMoveFromFen(
  fen: string,
  depth: number
): MoveInput | null {
  /**
   * Returns a best move for the current side-to-move using a small alpha-beta minimax.
   * Intended for casual/beginner play (fast and lightweight).
   */
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  let bestMove: Move | null = null;
  let bestScore = chess.turn() === "w" ? -Infinity : Infinity;

  // Randomize slightly to avoid identical play every game.
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const m of shuffled) {
    chess.move(m);
    const score = minimax(chess, Math.max(0, depth - 1), -Infinity, Infinity);
    chess.undo();

    if (chess.turn() === "w") {
      // Note: chess.turn() flipped after undo; use m.color instead
    }

    if (m.color === "w") {
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
  }

  if (!bestMove) return null;

  return {
    from: bestMove.from,
    to: bestMove.to,
    promotion: (bestMove.promotion as MoveInput["promotion"]) ?? undefined
  };
}
