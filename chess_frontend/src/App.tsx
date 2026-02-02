import React from "react";
import ChessPage from "./pages/ChessPage";
import { useTheme } from "./hooks/useTheme";

// PUBLIC_INTERFACE
export default function App() {
  /** Main app shell: applies theme + renders the chess experience. */
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <ChessPage theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}
