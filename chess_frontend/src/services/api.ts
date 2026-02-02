import { getApiBaseUrl } from "./env";

export type SaveGamePayload = {
  fen: string;
  pgn: string;
  createdAt: string;
};

export type SaveGameResponse = { id: string };
export type LoadGameResponse = { fen: string; pgn?: string };

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export async function healthCheck(): Promise<
  | { ok: true; status: unknown }
  | { ok: false; error: string }
> {
  /**
   * Checks backend connectivity.
   * Backend: GET /
   */
  const base = getApiBaseUrl();
  const url = `${base}/`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return { ok: false, error: `Health check failed (${res.status})` };
    return { ok: true, status: await readJsonSafe(res) };
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
   * Saves a snapshot by creating a new server game initialized from the given FEN.
   *
   * Backend: POST /api/games
   * Body: { initialFen: string, creatorName?, creatorColor?, timeControl? }
   * Response: { gameId, player, state }
   */
  const base = getApiBaseUrl();
  const url = `${base}/api/games`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // We keep payload shape on the frontend, but map it to backend contract here.
      body: JSON.stringify({
        creatorName: "Saved Game",
        creatorColor: "w",
        initialFen: payload.fen
      })
    });

    if (!res.ok) {
      const body = await readJsonSafe(res);
      return {
        ok: false,
        status: res.status,
        error:
          typeof body === "object" && body && "message" in body
            ? String((body as any).message)
            : `Save failed (${res.status})`
      };
    }

    const data = (await readJsonSafe(res)) as any;
    const id = String(data?.gameId ?? "");
    if (!id) {
      return { ok: false, error: "Unexpected server response (missing gameId)" };
    }

    return { ok: true, data: { id } };
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
   * Loads a game snapshot by fetching its current server state.
   *
   * Backend: GET /api/games/:gameId
   * Response: GameState (includes fen, pgn)
   */
  const base = getApiBaseUrl();
  const url = `${base}/api/games/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      const body = await readJsonSafe(res);
      return {
        ok: false,
        status: res.status,
        error:
          typeof body === "object" && body && "message" in body
            ? String((body as any).message)
            : `Load failed (${res.status})`
      };
    }

    const data = (await readJsonSafe(res)) as any;
    const fen = String(data?.fen ?? "");
    if (!fen) return { ok: false, error: "Unexpected server response (missing fen)" };

    return { ok: true, data: { fen, pgn: typeof data?.pgn === "string" ? data.pgn : undefined } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
