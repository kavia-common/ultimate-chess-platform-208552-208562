import { useCallback, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "ultimate-retro-chess.theme";

// PUBLIC_INTERFACE
export function useTheme(): {
  /** Current theme ("light" | "dark"). */
  theme: Theme;
  /** Toggle between light/dark themes. */
  toggleTheme: () => void;
  /** Explicitly set the theme. */
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    // Apply theme to <html> for Tailwind's class-based dark mode.
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme
    }),
    [theme, toggleTheme, setTheme]
  );
}
