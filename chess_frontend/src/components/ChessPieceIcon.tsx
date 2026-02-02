import React from "react";

type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

type Props = {
  type: PieceType;
  color: "w" | "b";
  className?: string;
};

function fillFor(color: "w" | "b") {
  return color === "w" ? "currentColor" : "currentColor";
}

// PUBLIC_INTERFACE
export default function ChessPieceIcon({ type, color, className }: Props) {
  /**
   * Lightweight inline SVG chess icons (no external assets).
   * Styled via currentColor to match the theme.
   */
  const common = {
    viewBox: "0 0 24 24",
    role: "img" as const,
    "aria-hidden": true as const,
    className
  };

  const stroke = color === "w" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)";
  const fill = fillFor(color);

  switch (type) {
    case "k":
      return (
        <svg {...common}>
          <path
            d="M12 2v4m-2 0h4M7 22h10l-1.2-5.4a6.2 6.2 0 0 0-7.6 0L7 22Z"
            fill={fill}
            opacity="0.9"
          />
          <path
            d="M12 6c-3.2 0-5 2-5 4.5 0 2.1 1.2 3.7 3 4.4l-.7 2.1h5.4l-.7-2.1c1.8-.7 3-2.3 3-4.4C17 8 15.2 6 12 6Z"
            fill={fill}
          />
          <path
            d="M6.5 22h11"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "q":
      return (
        <svg {...common}>
          <path
            d="M6 8l2 6 4-5 4 5 2-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7 22h10l-1.2-5.6H8.2L7 22Z"
            fill={fill}
            opacity="0.9"
          />
          <circle cx="6" cy="7" r="1.3" fill={fill} />
          <circle cx="12" cy="6" r="1.3" fill={fill} />
          <circle cx="18" cy="7" r="1.3" fill={fill} />
        </svg>
      );
    case "r":
      return (
        <svg {...common}>
          <path
            d="M7 5h2v2h2V5h2v2h2V5h2v5H7V5Z"
            fill={fill}
            opacity="0.95"
          />
          <path d="M8 10h8v7H8v-7Z" fill={fill} opacity="0.85" />
          <path d="M7 22h10l-1-3H8l-1 3Z" fill={fill} opacity="0.9" />
        </svg>
      );
    case "b":
      return (
        <svg {...common}>
          <path
            d="M12 3c2.6 1.8 3.2 4.2 1.7 6.2l1.6 1.6-3.3 3.3-3.3-3.3 1.6-1.6C8.8 7.2 9.4 4.8 12 3Z"
            fill={fill}
            opacity="0.9"
          />
          <path
            d="M8 22h8l-1.2-5.8a5.4 5.4 0 0 0-5.6 0L8 22Z"
            fill={fill}
            opacity="0.85"
          />
          <path
            d="M12 9.2v2.2"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "n":
      return (
        <svg {...common}>
          <path
            d="M8 20h9l-1.2-4.8c-.7-2.7-2.9-4.2-6-4.2H8v9Z"
            fill={fill}
            opacity="0.9"
          />
          <path
            d="M8 11c.6-3.6 3.2-6.2 8-7-1 2.5-2.3 4-4.1 4.8 1.4.2 2.5 1 3.4 2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M7 22h10l-1-2H8l-1 2Z" fill={fill} opacity="0.9" />
        </svg>
      );
    case "p":
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" fill={fill} opacity="0.95" />
          <path
            d="M8.2 22h7.6l-1.2-6.2a4.3 4.3 0 0 0-5.2 0L8.2 22Z"
            fill={fill}
            opacity="0.85"
          />
        </svg>
      );
  }
}
