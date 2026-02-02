import React from "react";
import { Chess, type Color, type Move, type Square } from "chess.js";
import ChessPieceIcon from "./ChessPieceIcon";

type Props = {
  fen: string;
  orientation: Color; // 'w' = white at bottom, 'b' = black at bottom
  selected: Square | null;
  legalTargets: Set<Square>;
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  onSquareClick: (sq: Square) => void;
};

function squareColor(fileIndex: number, rankIndex: number): "light" | "dark" {
  // rankIndex: 0..7 from top (8th rank) to bottom (1st rank)
  const isDark = (fileIndex + rankIndex) % 2 === 1;
  return isDark ? "dark" : "light";
}

function squareLabel(sq: Square) {
  const file = sq[0];
  const rank = sq[1];
  return `${file}${rank}`;
}

// PUBLIC_INTERFACE
export default function ChessBoard({
  fen,
  orientation,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  onSquareClick
}: Props) {
  /** Renders a clickable 8x8 chess board driven by FEN. */
  const chess = new Chess(fen);
  const board = chess.board(); // 8x8, top to bottom (8->1)

  const ranks = [...Array(8)].map((_, i) => i);
  const files = [...Array(8)].map((_, i) => i);

  const rankOrder = orientation === "w" ? ranks : [...ranks].reverse();
  const fileOrder = orientation === "w" ? files : [...files].reverse();

  return (
    <div className="retro-border retro-glow rounded-2xl bg-[var(--surface)] p-3">
      <div
        className={[
          // Responsive sizing:
          // - `w-full` keeps it fluid on small screens
          // - `max-w-[640px]` makes it larger on desktop than before (560px -> 640px)
          // - `lg:max-w-[720px]` gives an additional bump on large screens
          // - `min()`/`clamp()`-style behavior is approximated via breakpoints + max-w
          // Layout safety:
          // - In the page grid, the board column is `minmax(0, 1fr)` and the side panel is fixed (360px),
          //   so increasing max width won't break the panel; instead the board will fill available space up to these caps.
          "grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl retro-border",
          "max-w-[640px] lg:max-w-[720px]"
        ].join(" ")}
        role="grid"
        aria-label="Chess board"
      >
        {rankOrder.map((rankIdx) =>
          fileOrder.map((fileIdx) => {
            const piece = board[rankIdx][fileIdx];
            const fileChar = "abcdefgh"[fileIdx];
            const rankChar = String(8 - rankIdx);
            const sq = `${fileChar}${rankChar}` as Square;

            const baseSquare =
              squareColor(fileIdx, rankIdx) === "light"
                ? "bg-[var(--board-light)]"
                : "bg-[var(--board-dark)]";

            const isSelected = selected === sq;
            const isTarget = legalTargets.has(sq);

            const isLastFrom = lastMove?.from === sq;
            const isLastTo = lastMove?.to === sq;
            const isCheck = checkSquare === sq;

            const overlay =
              isCheck
                ? "bg-[var(--check)]"
                : isLastFrom || isLastTo
                  ? "bg-[var(--lastmove)]"
                  : isSelected || isTarget
                    ? "bg-[var(--hint)]"
                    : "";

            const ring =
              isSelected
                ? "ring-4 ring-[var(--accent)]"
                : isTarget
                  ? "ring-2 ring-[var(--accent-2)]"
                  : "";

            const pieceColor = piece?.color ?? "w";
            const pieceType = piece?.type ?? "p";

            const aria = piece
              ? `${squareLabel(sq)} ${piece.color === "w" ? "White" : "Black"} ${
                  piece.type.toUpperCase()
                }`
              : `${squareLabel(sq)} empty`;

            return (
              <button
                key={sq}
                type="button"
                onClick={() => onSquareClick(sq)}
                className={[
                  "relative flex items-center justify-center",
                  "transition-colors duration-150",
                  baseSquare,
                  overlay,
                  ring
                ].join(" ")}
                role="gridcell"
                aria-label={aria}
              >
                {piece ? (
                  <span
                    className={[
                      // Scale pieces a bit up on larger screens to better fill the (now larger) squares.
                      "animate-piece-pop inline-flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12",
                      pieceColor === "w"
                        ? "text-slate-50 drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
                        : "text-slate-900 drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
                    ].join(" ")}
                  >
                    <ChessPieceIcon
                      type={pieceType as Move["piece"]}
                      color={pieceColor}
                      className="h-11 w-11 sm:h-12 sm:w-12"
                    />
                  </span>
                ) : null}

                {isTarget && !piece ? (
                  <span className="absolute h-3 w-3 rounded-full bg-[var(--accent-2)]/70" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
