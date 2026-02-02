import React from "react";
import type { Color } from "chess.js";
import { colorLabel, formatMs } from "../utils/chessFormat";

type Props = {
  color: Color;
  ms: number;
  active: boolean;
};

// PUBLIC_INTERFACE
export default function Clock({ color, ms, active }: Props) {
  /** Displays a single player's remaining time. */
  return (
    <div
      className={[
        "retro-border rounded-lg px-3 py-2",
        "flex items-center justify-between gap-3",
        active ? "bg-[var(--hint)]" : "bg-[var(--surface-2)]"
      ].join(" ")}
      aria-label={`${colorLabel(color)} clock: ${formatMs(ms)}`}
    >
      <span className="font-retro text-[10px] text-[var(--muted)]">
        {colorLabel(color)}
      </span>
      <span className="font-retro text-[12px] tabular-nums">{formatMs(ms)}</span>
    </div>
  );
}
