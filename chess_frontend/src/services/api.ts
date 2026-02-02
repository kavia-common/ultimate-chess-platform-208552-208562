import { getApiBaseUrl } from "./env";

export type SaveGamePayload = {
  fen: string;
  pgn: string;
  createdAt: string;
};

export type SaveGameResponse = { id: string };
export type LoadGameResponse = { fen: string; pgn?: string };

// PUBLIC_INTERFACE
export async function healthCheck(): Promise<
  | { ok: true; status: unknown }
  | { ok: false; error: string }
> {
  /**
   * Checks backend connectivity.
   * Note: current backend OpenAPI only documents GET / (health).
   */
  const base = getApiBaseUrl();
  const url = `${base}/`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return { ok: false, error: `Health check failed (${res.status})` };
    return { ok: true, status: await res.json() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

// PUBLIC_INTERFACE
export async function saveGameToServer(
  payload: SaveGamePayload
): Promise<
  | { ok: true; data: SaveGameResponse }
  | { ok: false; error: string; status?: number }
> {
  /**
   * Attempts to save the game to the backend.
   * Expected future endpoint (not present yet): POST /games
   */
  const base = getApiBaseUrl();
  const url = `${base}/games`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 404
            ? "Save endpoint not implemented on backend yet (POST /games)."
            : `Save failed (${res.status})`
      };
    }

    const data = (await res.json()) as SaveGameResponse;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

// PUBLIC_INTERFACE
export async function loadGameFromServer(
  id: string
): Promise<
  | { ok: true; data: LoadGameResponse }
  | { ok: false; error: string; status?: number }
> {
  /**
   * Attempts to load the game from the backend.
   * Expected future endpoint (not present yet): GET /games/:id
   */
  const base = getApiBaseUrl();
  const url = `${base}/games/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 404
            ? "Load endpoint not implemented on backend yet (GET /games/:id)."
            : `Load failed (${res.status})`
      };
    }

    const data = (await res.json()) as LoadGameResponse;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
