import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
};

// PUBLIC_INTERFACE
export default function RetroButton({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: Props) {
  /** Shared retro button styles with accessible focus. */
  const base =
    "retro-border rounded-lg font-retro tracking-wide transition-transform active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed";
  const pad = size === "sm" ? "px-3 py-2 text-[10px]" : "px-4 py-3 text-[11px]";

  const colors =
    variant === "primary"
      ? "bg-[var(--accent)] text-white"
      : variant === "danger"
        ? "bg-[var(--danger)] text-white"
        : "bg-[var(--surface-2)] text-[var(--text)]";

  return (
    <button
      {...rest}
      className={[base, pad, colors, className ?? ""].join(" ")}
    />
  );
}
