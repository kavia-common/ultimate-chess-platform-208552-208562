import React from "react";
import type { Color } from "chess.js";
import type { PromotionPiece } from "../hooks/useChessGame";
import ChessPieceIcon from "./ChessPieceIcon";
import RetroButton from "./RetroButton";

type Props = {
  open: boolean;
  color: Color;
  onPick: (p: PromotionPiece) => void;
  onClose: () => void;
};

// PUBLIC_INTERFACE
export default function PromotionModal({ open, color, onPick, onClose }: Props) {
  /** Minimal promotion picker modal. */
  if (!open) return null;

  const pieces: Array<{ p: PromotionPiece; label: string; type: "q" | "r" | "b" | "n" }> =
    [
      { p: "q", label: "Queen", type: "q" },
      { p: "r", label: "Rook", type: "r" },
      { p: "b", label: "Bishop", type: "b" },
      { p: "n", label: "Knight", type: "n" }
    ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
    >
      <div className="retro-border retro-glow w-full max-w-md rounded-xl bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-retro text-xs text-[var(--muted)]">PROMOTION</h3>
          <button
            className="font-retro text-xs text-[var(--muted)] hover:text-[var(--text)]"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--muted)]">
          Pick a piece to promote to:
        </p>

        <div className="grid grid-cols-2 gap-3">
          {pieces.map(({ p, label, type }) => (
            <RetroButton
              key={p}
              variant="secondary"
              onClick={() => onPick(p)}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-2)]">
                  <ChessPieceIcon
                    type={type}
                    color={color === "w" ? "w" : "b"}
                    className="h-6 w-6"
                  />
                </span>
                <span>{label}</span>
              </span>
              <span className="text-[10px] text-[var(--muted)]">{p.toUpperCase()}</span>
            </RetroButton>
          ))}
        </div>
      </div>
    </div>
  );
}
