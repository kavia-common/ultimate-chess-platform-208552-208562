import React from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

// PUBLIC_INTERFACE
export default function Panel({ title, children, className }: Props) {
  /** Retro panel wrapper. */
  return (
    <section
      className={[
        "retro-border retro-glow rounded-xl bg-[var(--surface)]",
        "px-4 py-4",
        className ?? ""
      ].join(" ")}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-retro text-xs text-[var(--muted)]">{title}</h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
      ) : null}
      {children}
    </section>
  );
}
