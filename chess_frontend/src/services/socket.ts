import { io, type Socket } from "socket.io-client";
import { getWsUrl } from "./env";

export type MultiplayerColorPreference = "w" | "b" | "random";

export type TimeControl = {
  initialMs?: number;
  incrementMs?: number;
};

export type Participant = {
  playerId: string;
  color: "w" | "b" | null;
  role: "player" | "spectator";
};

export type PlayerPublic = {
  name: string | null;
  color: "w" | "b";
  present: boolean;
};

export type ClocksState = {
  initialMs: number;
  incrementMs: number;
  wRemainingMs: number;
  bRemainingMs: number;
  activeColor: "w" | "b" | null;
  running: boolean;
};

export type GameStatus = {
  state: "waiting" | "active" | "finished";
  winner: "w" | "b" | null;
  reason: string | null;
  isCheck: boolean;
};

export type GameState = {
  gameId: string;
  fen: string;
  pgn: string;
  turn: "w" | "b";
  moveCursor: number;
  history: Array<unknown>;
  status: GameStatus;
  players: { w: PlayerPublic; b: PlayerPublic };
  clocks: ClocksState;
  createdAt: string;
  updatedAt: string;
};

export type ServerHelloPayload = {
  name: string;
  version: string;
  now: string;
};

export type ServerToClientEvents = {
  "server:hello": (payload: ServerHelloPayload) => void;
  "match:found": (payload: { gameId: string; participant: Participant; state: GameState }) => void;
  "game:state": (payload: GameState) => void;
  "game:error": (payload: { message: string }) => void;
};

export type ClientToServerEvents = {
  "match:find": (
    payload: { name?: string; timeControl?: TimeControl },
    ack?: (res: { ok: boolean; message?: string }) => void
  ) => void;
  "match:cancel": (
    payload?: Record<string, never>,
    ack?: (res: { ok: boolean; message?: string }) => void
  ) => void;

  "game:create": (
    payload: {
      creatorName?: string;
      creatorColor?: "w" | "b";
      timeControl?: TimeControl;
      initialFen?: string;
    },
    ack?: (res: { ok: boolean; message?: string; gameId?: string; player?: Participant; state?: GameState }) => void
  ) => void;

  "game:join": (
    payload: {
      gameId: string;
      name?: string;
      playerId?: string;
      requestedColor?: "w" | "b";
    },
    ack?: (res: { ok: boolean; message?: string; gameId?: string; participant?: Participant; state?: GameState }) => void
  ) => void;

  "game:leave": (
    payload: { gameId: string; playerId: string },
    ack?: (res: { ok: boolean; message?: string }) => void
  ) => void;

  "game:sync": (
    payload: { gameId: string },
    ack?: (res: { ok: boolean; message?: string; state?: GameState }) => void
  ) => void;

  "game:move": (
    payload: {
      gameId: string;
      playerId: string;
      from: string;
      to: string;
      promotion?: string;
    },
    ack?: (res: { ok: boolean; message?: string; state?: GameState }) => void
  ) => void;

  "game:undo": (
    payload: { gameId: string; playerId: string },
    ack?: (res: { ok: boolean; message?: string; state?: GameState }) => void
  ) => void;

  "game:redo": (
    payload: { gameId: string; playerId: string },
    ack?: (res: { ok: boolean; message?: string; state?: GameState }) => void
  ) => void;
};

// PUBLIC_INTERFACE
export function createSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  /**
   * Creates a socket.io client aligned with backend Socket.IO contract.
   *
   * Connection URL:
   * - Use REACT_APP_WS_URL (recommended when frontend/backends are on different origins)
   * - Falls back to REACT_APP_API_BASE_URL or window.location.origin
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
