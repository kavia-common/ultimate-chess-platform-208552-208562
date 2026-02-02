import React from "react";
import type { Move } from "chess.js";

type Props = {
  moves: Move[];
};

// PUBLIC_INTERFACE
export default function MoveHistory({ moves }: Props) {
  /** Render move list grouped into turns (1. e4 e5). */
  const rows: Array<{ num: number; white?: string; black?: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i]?.san,
      black: moves[i + 1]?.san
    });
  }

  return (
    <div className="max-h-72 overflow-auto pr-1">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 bg-[var(--surface)]">
          <tr className="text-[10px] font-retro text-[var(--muted)]">
            <th className="w-10 py-1">#</th>
            <th className="py-1">W</th>
            <th className="py-1">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="py-3 text-xs text-[var(--muted)]"
              >
                No moves yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.num} className="text-xs">
                <td className="py-1 pr-2 font-retro text-[10px] text-[var(--muted)]">
                  {r.num}
                </td>
                <td className="py-1 pr-2">{r.white ?? ""}</td>
                <td className="py-1">{r.black ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
