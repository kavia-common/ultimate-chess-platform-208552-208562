import { io, type Socket } from "socket.io-client";
import { getWsUrl } from "./env";

export type MultiplayerColorPreference = "w" | "b" | "random";

export type RoomStatePayload = {
  roomId: string;
  fen: string;
  yourColor: "w" | "b";
};

export type ServerToClientEvents = {
  "room:state": (payload: RoomStatePayload) => void;
  "game:move": (payload: { fen: string }) => void;
  "room:error": (payload: { message: string }) => void;
};

export type ClientToServerEvents = {
  "room:join": (
    payload: { roomId: string; colorPreference: MultiplayerColorPreference },
    ack?: (res: { ok: boolean; message?: string }) => void
  ) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "game:move": (
    payload: { roomId: string; move: { from: string; to: string; promotion?: string } },
    ack?: (res: { ok: boolean; message?: string; fen?: string }) => void
  ) => void;
};

// PUBLIC_INTERFACE
export function createSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  /**
   * Creates a socket.io client. Backend socket contract may evolve; this client
   * is defensive and surfaces errors in UI.
   */
  const url = getWsUrl();

  return io(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    timeout: 8000
  });
}
