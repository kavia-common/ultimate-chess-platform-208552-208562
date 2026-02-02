import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createSocket,
  type GameState,
  type MultiplayerColorPreference,
  type Participant,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type TimeControl
} from "../services/socket";

type ConnectionState =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "error"; message: string };

type MultiplayerState = {
  connection: ConnectionState;
  gameId: string | null;
  participant: Participant | null;
  latestState: GameState | null;
  lastError: string | null;
};

const TOKEN_PREFIX = "ultimate-retro-chess.playerToken.";

function tokenKey(gameId: string) {
  return `${TOKEN_PREFIX}${gameId}`;
}

function loadStoredPlayerId(gameId: string): string | null {
  try {
    const raw = window.localStorage.getItem(tokenKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { playerId?: string };
    return typeof parsed.playerId === "string" && parsed.playerId ? parsed.playerId : null;
  } catch {
    return null;
  }
}

function storePlayerId(gameId: string, participant: Participant) {
  try {
    window.localStorage.setItem(
      tokenKey(gameId),
      JSON.stringify({ playerId: participant.playerId })
    );
  } catch {
    // ignore quota/JSON errors
  }
}

// PUBLIC_INTERFACE
export function useMultiplayer() {
  /**
   * Multiplayer client state manager (Socket.IO) aligned with backend contract:
   * - Connect/disconnect
   * - Create game / join game (with reconnect token)
   * - Send moves (server-authoritative)
   * - Receive authoritative `game:state`
   */
  const socketRef =
    useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [state, setState] = useState<MultiplayerState>({
    connection: { kind: "idle" },
    gameId: null,
    participant: null,
    latestState: null,
    lastError: null
  });

  // Avoid stale closures when emitting with ack
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const ensureSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = createSocket();
    }
    return socketRef.current;
  }, []);

  const connect = useCallback(() => {
    const socket = ensureSocket();

    if (socket.connected) {
      setState((s) => ({ ...s, connection: { kind: "connected" } }));
      return;
    }

    setState((s) => ({ ...s, connection: { kind: "connecting" }, lastError: null }));
    socket.connect();
  }, [ensureSocket]);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.disconnect();
    setState({
      connection: { kind: "idle" },
      gameId: null,
      participant: null,
      latestState: null,
      lastError: null
    });
  }, []);

  const createGame = useCallback(
    async (opts: {
      name?: string;
      colorPreference: MultiplayerColorPreference;
      timeControl?: TimeControl;
      initialFen?: string;
    }) => {
      const socket = ensureSocket();
      if (!socket.connected) connect();

      const creatorColor =
        opts.colorPreference === "random" ? undefined : opts.colorPreference;

      return new Promise<{ ok: boolean; message?: string; gameId?: string }>((resolve) => {
        socket.emit(
          "game:create",
          {
            creatorName: opts.name,
            creatorColor,
            timeControl: opts.timeControl,
            initialFen: opts.initialFen
          },
          (ack) => {
            if (!ack?.ok) {
              setState((s) => ({
                ...s,
                lastError: ack?.message ?? "Failed to create game"
              }));
              resolve({ ok: false, message: ack?.message });
              return;
            }

            const gameId = ack.gameId ?? null;
            const participant = ack.player ?? null;
            const latestState = ack.state ?? null;

            setState((s) => ({
              ...s,
              gameId,
              participant,
              latestState,
              lastError: null
            }));

            if (gameId && participant) storePlayerId(gameId, participant);
            resolve({ ok: true, gameId: gameId ?? undefined });
          }
        );
      });
    },
    [connect, ensureSocket]
  );

  const joinGame = useCallback(
    async (opts: {
      gameId: string;
      name?: string;
      colorPreference: MultiplayerColorPreference;
    }) => {
      const socket = ensureSocket();
      if (!socket.connected) connect();

      const requestedColor =
        opts.colorPreference === "random" ? undefined : opts.colorPreference;

      const storedPlayerId = loadStoredPlayerId(opts.gameId);

      return new Promise<{ ok: boolean; message?: string; gameId?: string }>((resolve) => {
        socket.emit(
          "game:join",
          {
            gameId: opts.gameId,
            name: opts.name,
            playerId: storedPlayerId ?? undefined,
            requestedColor
          },
          (ack) => {
            if (!ack?.ok) {
              setState((s) => ({
                ...s,
                lastError: ack?.message ?? "Failed to join game"
              }));
              resolve({ ok: false, message: ack?.message });
              return;
            }

            const gameId = ack.gameId ?? opts.gameId;
            const participant = ack.participant ?? null;
            const latestState = ack.state ?? null;

            setState((s) => ({
              ...s,
              gameId,
              participant,
              latestState,
              lastError: null
            }));

            if (participant) storePlayerId(gameId, participant);
            resolve({ ok: true, gameId });
          }
        );
      });
    },
    [connect, ensureSocket]
  );

  const leaveGame = useCallback(async () => {
    const socket = socketRef.current;
    const cur = stateRef.current;
    if (!socket || !cur.gameId || !cur.participant) return;

    // Capture into locals so TS keeps the narrowed types inside nested callbacks.
    const gameId = cur.gameId;
    const playerId = cur.participant.playerId;

    return new Promise<{ ok: boolean; message?: string }>((resolve) => {
      socket.emit("game:leave", { gameId, playerId }, (ack) => {
        if (!ack?.ok) {
          setState((s) => ({
            ...s,
            lastError: ack?.message ?? "Failed to leave game"
          }));
          resolve({ ok: false, message: ack?.message });
          return;
        }

        setState((s) => ({
          ...s,
          gameId: null,
          participant: null,
          latestState: null
        }));
        resolve({ ok: true });
      });
    });
  }, []);

  const sendMove = useCallback(
    async (payload: {
      from: string;
      to: string;
      promotion?: string;
    }): Promise<{ ok: boolean; message?: string; state?: GameState }> => {
      const socket = socketRef.current;
      const cur = stateRef.current;

      if (!socket) return { ok: false, message: "Socket not initialized" };
      if (!socket.connected) return { ok: false, message: "Not connected" };
      if (!cur.gameId) return { ok: false, message: "Not in a game" };
      if (!cur.participant) return { ok: false, message: "Missing player token" };
      if (cur.participant.role !== "player" || !cur.participant.color) {
        return { ok: false, message: "Spectators cannot move" };
      }

      return new Promise((resolve) => {
        setState((s) => ({ ...s, lastError: null }));

        socket.emit(
          "game:move",
          {
            gameId: cur.gameId!,
            playerId: cur.participant!.playerId,
            from: payload.from,
            to: payload.to,
            promotion: payload.promotion
          },
          (ack) => {
            if (!ack?.ok) {
              setState((s) => ({
                ...s,
                lastError: ack?.message ?? "Move rejected by server"
              }));
              resolve({ ok: false, message: ack?.message });
              return;
            }

            if (ack.state) {
              setState((s) => ({ ...s, latestState: ack.state ?? s.latestState }));
            }
            resolve({ ok: true, state: ack?.state });
          }
        );
      });
    },
    []
  );

  useEffect(() => {
    const socket = ensureSocket();

    const onConnect = () => {
      setState((s) => ({ ...s, connection: { kind: "connected" } }));
    };

    const onDisconnect = () => {
      setState((s) => ({ ...s, connection: { kind: "idle" } }));
    };

    const onConnectError = (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to connect to multiplayer server";
      setState((s) => ({ ...s, connection: { kind: "error", message: msg } }));
    };

    const onMatchFound = (payload: { gameId: string; participant: Participant; state: GameState }) => {
      setState((s) => ({
        ...s,
        gameId: payload.gameId,
        participant: payload.participant,
        latestState: payload.state,
        lastError: null
      }));
      storePlayerId(payload.gameId, payload.participant);
    };

    const onGameState = (payload: GameState) => {
      setState((s) => ({
        ...s,
        gameId: payload.gameId ?? s.gameId,
        latestState: payload,
        lastError: null
      }));
    };

    const onGameError = (payload: { message: string }) => {
      setState((s) => ({ ...s, lastError: payload.message }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("match:found", onMatchFound);
    socket.on("game:state", onGameState);
    socket.on("game:error", onGameError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("match:found", onMatchFound);
      socket.off("game:state", onGameState);
      socket.off("game:error", onGameError);
    };
  }, [ensureSocket]);

  const yourColor = state.participant?.role === "player" ? state.participant.color : null;

  return useMemo(
    () => ({
      connection: state.connection,
      gameId: state.gameId,
      participant: state.participant,
      yourColor,
      latestState: state.latestState,
      lastError: state.lastError,

      connect,
      disconnect,
      createGame,
      joinGame,
      leaveGame,
      sendMove
    }),
    [state, yourColor, connect, disconnect, createGame, joinGame, leaveGame, sendMove]
  );
}
