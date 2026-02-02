import { useEffect, useRef } from "react";

// PUBLIC_INTERFACE
export function useInterval(callback: () => void, delayMs: number | null) {
  /** Declarative setInterval hook (cleans up reliably under React StrictMode). */
  const savedCb = useRef(callback);

  useEffect(() => {
    savedCb.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;

    const id = window.setInterval(() => savedCb.current(), delayMs);
    return () => window.clearInterval(id);
  }, [delayMs]);
}
