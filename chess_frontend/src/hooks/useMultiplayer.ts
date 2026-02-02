import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createSocket,
  type MultiplayerColorPreference,
  type RoomStatePayload,
  type ServerToClientEvents,
  type ClientToServerEvents
} from "../services/socket";

type ConnectionState =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "error"; message: string };

type MultiplayerState = {
  connection: ConnectionState;
  roomId: string | null;
  yourColor: "w" | "b" | null;
  latestFen: string | null;
  lastError: string | null;
};

// PUBLIC_INTERFACE
export function useMultiplayer() {
  /**
   * Multiplayer client state manager (socket.io).
   * - Connect/disconnect
   * - Join/leave room
   * - Send moves
   * - Receive authoritative room/game state
   */
  const socketRef =
    useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [state, setState] = useState<MultiplayerState>({
    connection: { kind: "idle" },
    roomId: null,
    yourColor: null,
    latestFen: null,
    lastError: null
  });

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
      roomId: null,
      yourColor: null,
      latestFen: null,
      lastError: null
    });
  }, []);

  const joinRoom = useCallback(
    async (roomId: string, colorPreference: MultiplayerColorPreference) => {
      const socket = ensureSocket();
      if (!socket.connected) connect();

      return new Promise<{ ok: boolean; message?: string }>((resolve) => {
        socket.emit(
          "room:join",
          { roomId, colorPreference },
          (ack = { ok: true }) => {
            if (!ack.ok) {
              setState((s) => ({
                ...s,
                lastError: ack.message ?? "Failed to join room"
              }));
            } else {
              setState((s) => ({ ...s, roomId, lastError: null }));
            }
            resolve(ack);
          }
        );
      });
    },
    [connect, ensureSocket]
  );

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    setState((s) => {
      if (socket && s.roomId) socket.emit("room:leave", { roomId: s.roomId });
      return { ...s, roomId: null, yourColor: null, latestFen: null };
    });
  }, []);

  const sendMove = useCallback(
    async (payload: {
      from: string;
      to: string;
      promotion?: string;
    }): Promise<{ ok: boolean; message?: string; fen?: string }> => {
      const socket = socketRef.current;
      if (!socket) return { ok: false, message: "Socket not initialized" };
      if (!socket.connected) return { ok: false, message: "Not connected" };

      return new Promise((resolve) => {
        setState((s) => ({ ...s, lastError: null }));

        const roomId = state.roomId;
        if (!roomId) {
          resolve({ ok: false, message: "Not in a room" });
          return;
        }

        socket.emit("game:move", { roomId, move: payload }, (ack) => {
          if (!ack?.ok) {
            setState((s) => ({
              ...s,
              lastError: ack?.message ?? "Move rejected by server"
            }));
          }
          resolve(ack ?? { ok: true });
        });
      });
    },
    [state.roomId]
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

    const onRoomState = (payload: RoomStatePayload) => {
      setState((s) => ({
        ...s,
        roomId: payload.roomId,
        yourColor: payload.yourColor,
        latestFen: payload.fen,
        lastError: null
      }));
    };

    const onGameMove = (payload: { fen: string }) => {
      setState((s) => ({ ...s, latestFen: payload.fen, lastError: null }));
    };

    const onRoomError = (payload: { message: string }) => {
      setState((s) => ({ ...s, lastError: payload.message }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:state", onRoomState);
    socket.on("game:move", onGameMove);
    socket.on("room:error", onRoomError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:state", onRoomState);
      socket.off("game:move", onGameMove);
      socket.off("room:error", onRoomError);
    };
  }, [ensureSocket]);

  return useMemo(
    () => ({
      ...state,
      connect,
      disconnect,
      joinRoom,
      leaveRoom,
      sendMove
    }),
    [state, connect, disconnect, joinRoom, leaveRoom, sendMove]
  );
}
