import type { Color } from "chess.js";

// PUBLIC_INTERFACE
export function formatMs(ms: number): string {
  /** Format milliseconds as M:SS (clamped at 0). */
  const clamped = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// PUBLIC_INTERFACE
export function colorLabel(c: Color): "White" | "Black" {
  /** Human-readable label for chess.js Color. */
  return c === "w" ? "White" : "Black";
}
