import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, type Color, type Move, type Square } from "chess.js";
import { useInterval } from "./useInterval";

export type PromotionPiece = "q" | "r" | "b" | "n";
export type MoveInput = { from: Square; to: Square; promotion?: PromotionPiece };

export type GameStatus =
  | { kind: "playing"; inCheck: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw" };

export type ClockState = {
  initialMs: number;
  whiteMs: number;
  blackMs: number;
  running: boolean;
};

type UseChessGameOptions = {
  initialClockMs: number;
};

function deriveStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) {
    // Side to move is checkmated => winner is opposite.
    const winner: Color = chess.turn() === "w" ? "b" : "w";
    return { kind: "checkmate", winner };
  }
  if (chess.isStalemate()) return { kind: "stalemate" };
  if (chess.isDraw()) return { kind: "draw" };
  return { kind: "playing", inCheck: chess.isCheck() };
}

function findKingSquare(chess: Chess, color: Color): Square | null {
  const b = chess.board();
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b[r].length; c++) {
      const p = b[r][c];
      if (!p) continue;
      if (p.type === "k" && p.color === color) {
        const file = "abcdefgh"[c];
        const rank = String(8 - r);
        return `${file}${rank}` as Square;
      }
    }
  }
  return null;
}

// PUBLIC_INTERFACE
export function useChessGame(options: UseChessGameOptions) {
  /**
   * Gameplay engine wrapper around chess.js:
   * - legal move validation
   * - move history
   * - undo/redo
   * - clocks
   * - status derivation (check/mate/draw)
   */
  const chessRef = useRef(new Chess());

  const [fen, setFen] = useState<string>(chessRef.current.fen());
  const [history, setHistory] = useState<Move[]>(
    chessRef.current.history({ verbose: true }) as Move[]
  );
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null
  );

  const redoRef = useRef<MoveInput[]>([]);

  const [clock, setClock] = useState<ClockState>(() => ({
    initialMs: options.initialClockMs,
    whiteMs: options.initialClockMs,
    blackMs: options.initialClockMs,
    running: false
  }));

  const syncFromChess = useCallback(() => {
    const chess = chessRef.current;
    setFen(chess.fen());
    setHistory(chess.history({ verbose: true }) as Move[]);
  }, []);

  // Derive read-only values from `fen` to keep hooks dependency rules satisfied.
  const derivedChess = useMemo(() => new Chess(fen), [fen]);
  const status = useMemo(() => deriveStatus(derivedChess), [derivedChess]);
  const turn = useMemo(() => derivedChess.turn(), [derivedChess]);

  const checkKingSquare = useMemo(() => {
    if (status.kind !== "playing" || !status.inCheck) return null;
    return findKingSquare(derivedChess, turn);
  }, [derivedChess, status, turn]);

  const startClock = useCallback(() => {
    setClock((c) => ({ ...c, running: true }));
  }, []);

  const pauseClock = useCallback(() => {
    setClock((c) => ({ ...c, running: false }));
  }, []);

  const resetClocks = useCallback((initialMs: number) => {
    setClock({
      initialMs,
      whiteMs: initialMs,
      blackMs: initialMs,
      running: false
    });
  }, []);

  useInterval(
    () => {
      if (status.kind !== "playing") return;

      setClock((c) => {
        if (!c.running) return c;
        const active = chessRef.current.turn();
        const tick = 250;

        if (active === "w") {
          return { ...c, whiteMs: Math.max(0, c.whiteMs - tick) };
        }
        return { ...c, blackMs: Math.max(0, c.blackMs - tick) };
      });
    },
    clock.running ? 250 : null
  );

  const getLegalMovesFrom = useCallback((square: Square): Move[] => {
    const chess = chessRef.current;
    return chess.moves({ square, verbose: true }) as Move[];
  }, []);

  const makeMove = useCallback(
    (move: MoveInput): { ok: true; move: Move } | { ok: false; error: string } => {
      const chess = chessRef.current;

      try {
        const result = chess.move(move);
        if (!result) return { ok: false, error: "Illegal move" };

        // Any new move invalidates redo stack.
        redoRef.current = [];

        setLastMove({ from: result.from, to: result.to });
        syncFromChess();
        // Start clock when the first move happens.
        setClock((c) => ({ ...c, running: c.running || history.length === 0 }));
        return { ok: true, move: result };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Failed to make move"
        };
      }
    },
    [syncFromChess, history.length]
  );

  const undo = useCallback(() => {
    const chess = chessRef.current;
    const undone = chess.undo() as Move | null;
    if (!undone) return false;

    redoRef.current.push({
      from: undone.from,
      to: undone.to,
      promotion: (undone.promotion as PromotionPiece | undefined) ?? undefined
    });

    setLastMove(null);
    syncFromChess();
    return true;
  }, [syncFromChess]);

  const redo = useCallback(() => {
    const chess = chessRef.current;
    const next = redoRef.current.pop();
    if (!next) return false;

    const result = chess.move(next);
    if (!result) return false;

    setLastMove({ from: result.from, to: result.to });
    syncFromChess();
    return true;
  }, [syncFromChess]);

  const resetGame = useCallback(() => {
    chessRef.current = new Chess();
    redoRef.current = [];
    setLastMove(null);
    setFen(chessRef.current.fen());
    setHistory(chessRef.current.history({ verbose: true }) as Move[]);
    resetClocks(options.initialClockMs);
  }, [options.initialClockMs, resetClocks]);

  const loadFromFen = useCallback(
    (newFen: string) => {
      try {
        chessRef.current = new Chess(newFen);
        redoRef.current = [];
        setLastMove(null);
        syncFromChess();
        pauseClock();
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Invalid FEN"
        };
      }
    },
    [pauseClock, syncFromChess]
  );

  const exportPgn = useCallback(() => chessRef.current.pgn(), []);
  const exportFen = useCallback(() => chessRef.current.fen(), []);

  return useMemo(
    () => ({
      fen,
      turn,
      status,
      history,
      lastMove,
      checkKingSquare,
      clock,

      startClock,
      pauseClock,
      resetClocks,

      getLegalMovesFrom,
      makeMove,
      undo,
      redo,
      resetGame,
      loadFromFen,
      exportFen,
      exportPgn
    }),
    [
      fen,
      turn,
      status,
      history,
      lastMove,
      checkKingSquare,
      clock,
      startClock,
      pauseClock,
      resetClocks,
      getLegalMovesFrom,
      makeMove,
      undo,
      redo,
      resetGame,
      loadFromFen,
      exportFen,
      exportPgn
    ]
  );
}
