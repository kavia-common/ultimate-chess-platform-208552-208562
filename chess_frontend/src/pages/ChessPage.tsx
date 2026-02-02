import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Color, type Move, type Square } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import Clock from "../components/Clock";
import MoveHistory from "../components/MoveHistory";
import Panel from "../components/Panel";
import PromotionModal from "../components/PromotionModal";
import RetroButton from "../components/RetroButton";
import { useChessGame, type MoveInput, type PromotionPiece } from "../hooks/useChessGame";
import { useMultiplayer } from "../hooks/useMultiplayer";
import { getBestMoveFromFen } from "../utils/chessAi";
import { colorLabel } from "../utils/chessFormat";
import { healthCheck, loadGameFromServer, saveGameToServer } from "../services/api";

type GameMode = "local" | "ai" | "multiplayer";

type Props = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

function canPickUpPieceForTurn(pieceColor: Color, turn: Color, mode: GameMode, yourColor: Color | null) {
  if (mode === "multiplayer") {
    if (!yourColor) return false;
    return pieceColor === yourColor && turn === yourColor;
  }
  return pieceColor === turn;
}

function derivePieceColorAtSquare(fen: string, square: Square): Color | null {
  // Small helper: use chess.js to interpret the FEN for a single square.
  const chess = new Chess(fen);
  const p = chess.get(square);
  return p?.color ?? null;
}

// PUBLIC_INTERFACE
export default function ChessPage({ theme, onToggleTheme }: Props) {
  /** Full chess experience page (retro UI + gameplay + AI + multiplayer client). */
  const game = useChessGame({ initialClockMs: 5 * 60 * 1000 });

  const [mode, setMode] = useState<GameMode>("local");
  const [orientation, setOrientation] = useState<Color>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: Color;
  } | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string>("unknown");

  const multiplayer = useMultiplayer();
  const yourColor = multiplayer.yourColor;

  const legalTargets = useMemo(() => new Set(legalMoves.map((m) => m.to)), [legalMoves]);

  useEffect(() => {
    // Reset selection when turn changes / state changes.
    setSelected(null);
    setLegalMoves([]);
  }, [game.fen]);

  useEffect(() => {
    if (mode !== "multiplayer") return;
    multiplayer.connect();
  }, [mode, multiplayer]);

  useEffect(() => {
    if (mode !== "multiplayer") return;
    if (!multiplayer.latestFen) return;
    const res = game.loadFromFen(multiplayer.latestFen);
    if (!res.ok) {
      setMessage(`Failed to sync multiplayer state: ${res.error}`);
    }
  }, [mode, multiplayer.latestFen, game]);

  useEffect(() => {
    if (mode !== "ai") return;
    if (game.status.kind !== "playing") return;

    // AI plays as Black by default.
    if (game.turn !== "b") return;

    const t = window.setTimeout(() => {
      const best = getBestMoveFromFen(game.fen, 2);
      if (!best) return;
      const result = game.makeMove(best);
      if (!result.ok) {
        setMessage(`AI move failed: ${result.error}`);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [mode, game.fen, game.turn, game.status.kind, game]);

  const statusText = useMemo(() => {
    if (game.status.kind === "checkmate") {
      return `CHECKMATE — ${colorLabel(game.status.winner)} wins`;
    }
    if (game.status.kind === "stalemate") return "STALEMATE";
    if (game.status.kind === "draw") return "DRAW";
    return game.status.inCheck ? "CHECK" : "PLAYING";
  }, [game.status]);

  const onSquareClick = useCallback(
    (sq: Square) => {
      setMessage(null);

      // In multiplayer, if not connected/room, allow board inspection but not moves.
      if (mode === "multiplayer" && !multiplayer.roomId) {
        setMessage("Join a room to play multiplayer.");
      }

      // Determine if clicking a target square to move.
      if (selected) {
        const candidates = legalMoves.filter((m) => m.to === sq);

        if (candidates.length > 0) {
          // Promotion: chess.js provides multiple candidate moves for promotion with different 'promotion'.
          const promoCandidates = candidates.filter((m) => typeof m.promotion === "string");

          if (promoCandidates.length > 1) {
            const pieceColor = derivePieceColorAtSquare(game.fen, selected) ?? game.turn;
            setPendingPromotion({ from: selected, to: sq, color: pieceColor });
            setPromotionOpen(true);
            return;
          }

          const move: MoveInput = {
            from: selected,
            to: sq,
            promotion:
              (candidates[0]?.promotion as PromotionPiece | undefined) ?? undefined
          };

          const result = game.makeMove(move);
          if (!result.ok) {
            setMessage(result.error);
            return;
          }

          if (mode === "multiplayer" && multiplayer.roomId) {
            multiplayer
              .sendMove({
                from: move.from,
                to: move.to,
                promotion: move.promotion
              })
              .then((ack) => {
                if (!ack.ok) {
                  setMessage(ack.message ?? "Multiplayer move rejected.");
                }
              })
              .catch((e) =>
                setMessage(e instanceof Error ? e.message : "Failed to send move")
              );
          }

          return;
        }

        // If clicked not a legal target, reset selection unless it's another piece you can pick up.
        const clickedColor = derivePieceColorAtSquare(game.fen, sq);
        if (clickedColor) {
          if (canPickUpPieceForTurn(clickedColor, game.turn, mode, yourColor)) {
            setSelected(sq);
            setLegalMoves(game.getLegalMovesFrom(sq));
            return;
          }
        }

        setSelected(null);
        setLegalMoves([]);
        return;
      }

      // Selecting a piece to move.
      const clickedColor = derivePieceColorAtSquare(game.fen, sq);
      if (!clickedColor) {
        setSelected(null);
        setLegalMoves([]);
        return;
      }

      if (!canPickUpPieceForTurn(clickedColor, game.turn, mode, yourColor)) {
        setMessage(
          mode === "multiplayer"
            ? "Not your turn / not your piece."
            : "Not your turn."
        );
        return;
      }

      setSelected(sq);
      setLegalMoves(game.getLegalMovesFrom(sq));
    },
    [selected, legalMoves, game, mode, multiplayer, yourColor]
  );

  const onPickPromotion = useCallback(
    (p: PromotionPiece) => {
      if (!pendingPromotion) return;

      const move: MoveInput = {
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: p
      };

      const result = game.makeMove(move);
      if (!result.ok) {
        setMessage(result.error);
      } else if (mode === "multiplayer" && multiplayer.roomId) {
        multiplayer.sendMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      }

      setPromotionOpen(false);
      setPendingPromotion(null);
    },
    [pendingPromotion, game, mode, multiplayer]
  );

  const onClosePromotion = useCallback(() => {
    setPromotionOpen(false);
    setPendingPromotion(null);
  }, []);

  const onNewGame = useCallback(() => {
    game.resetGame();
    setMessage(null);
  }, [game]);

  const onUndo = useCallback(() => {
    if (mode === "multiplayer") {
      setMessage("Undo/redo disabled in multiplayer (server-authoritative).");
      return;
    }
    const ok = game.undo();
    if (!ok) setMessage("Nothing to undo.");
  }, [game, mode]);

  const onRedo = useCallback(() => {
    if (mode === "multiplayer") {
      setMessage("Undo/redo disabled in multiplayer (server-authoritative).");
      return;
    }
    const ok = game.redo();
    if (!ok) setMessage("Nothing to redo.");
  }, [game, mode]);

  const onFlip = useCallback(() => {
    setOrientation((o) => (o === "w" ? "b" : "w"));
  }, []);

  const onCheckBackend = useCallback(async () => {
    const res = await healthCheck();
    if (res.ok) {
      setServerStatus("ok");
      setMessage("Backend reachable (GET /).");
    } else {
      setServerStatus("error");
      setMessage(`Backend not reachable: ${res.error}`);
    }
  }, []);

  const onSaveLocal = useCallback(() => {
    const payload = {
      fen: game.exportFen(),
      pgn: game.exportPgn(),
      clock: game.clock,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem("ultimate-retro-chess.save", JSON.stringify(payload));
    setMessage("Saved locally.");
  }, [game]);

  const onLoadLocal = useCallback(() => {
    const raw = window.localStorage.getItem("ultimate-retro-chess.save");
    if (!raw) {
      setMessage("No local save found.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { fen: string; clock?: { initialMs: number } };
      const res = game.loadFromFen(parsed.fen);
      if (!res.ok) {
        setMessage(`Load failed: ${res.error}`);
        return;
      }
      if (parsed.clock?.initialMs) {
        game.resetClocks(parsed.clock.initialMs);
      }
      setMessage("Loaded local save.");
    } catch {
      setMessage("Corrupted local save.");
    }
  }, [game]);

  const [serverGameId, setServerGameId] = useState("");

  const onSaveServer = useCallback(async () => {
    const res = await saveGameToServer({
      fen: game.exportFen(),
      pgn: game.exportPgn(),
      createdAt: new Date().toISOString()
    });

    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setServerGameId(res.data.id);
    setMessage(`Saved to server: ${res.data.id}`);
  }, [game]);

  const onLoadServer = useCallback(async () => {
    if (!serverGameId.trim()) {
      setMessage("Enter a game id first.");
      return;
    }
    const res = await loadGameFromServer(serverGameId.trim());
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    const loadRes = game.loadFromFen(res.data.fen);
    if (!loadRes.ok) setMessage(loadRes.error);
    else setMessage("Loaded from server.");
  }, [serverGameId, game]);

  const [roomIdInput, setRoomIdInput] = useState("");
  const [colorPref, setColorPref] = useState<"random" | "w" | "b">("random");

  const onJoinRoom = useCallback(async () => {
    const roomId = roomIdInput.trim();
    if (!roomId) {
      setMessage("Enter a room id.");
      return;
    }

    const ack = await multiplayer.joinRoom(roomId, colorPref);
    if (!ack.ok) setMessage(ack.message ?? "Failed to join room.");
    else setMessage(`Joined room: ${roomId}`);
  }, [roomIdInput, colorPref, multiplayer]);

  const onLeaveRoom = useCallback(() => {
    multiplayer.leaveRoom();
    setMessage("Left room.");
  }, [multiplayer]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="retro-border rounded-xl bg-[var(--surface)] px-3 py-2">
            <span className="font-retro text-xs text-[var(--muted)]">
              ULTIMATE RETRO CHESS
            </span>
          </div>

          <div className="hidden sm:block text-xs text-[var(--muted)]">
            Mode: <span className="font-retro text-[10px]">{mode.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RetroButton
            variant="secondary"
            size="sm"
            onClick={() => setMode("local")}
            disabled={mode === "local"}
          >
            LOCAL
          </RetroButton>
          <RetroButton
            variant="secondary"
            size="sm"
            onClick={() => setMode("ai")}
            disabled={mode === "ai"}
          >
            VS AI
          </RetroButton>
          <RetroButton
            variant="secondary"
            size="sm"
            onClick={() => setMode("multiplayer")}
            disabled={mode === "multiplayer"}
          >
            MULTI
          </RetroButton>

          <div className="w-px self-stretch bg-[var(--border)] mx-1" />

          <RetroButton variant="primary" size="sm" onClick={onToggleTheme}>
            {theme === "dark" ? "LIGHT" : "DARK"}
          </RetroButton>
        </div>
      </header>

      {message ? (
        <div className="mb-4 retro-border rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="font-retro text-[10px] text-[var(--muted)]">SYSTEM:</span>{" "}
          {message}
        </div>
      ) : null}

      {multiplayer.lastError ? (
        <div className="mb-4 retro-border rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          <span className="font-retro text-[10px]">MULTI ERROR:</span>{" "}
          {multiplayer.lastError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex flex-col gap-4">
          <Panel title="BOARD">
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--muted)]">
                  Turn:{" "}
                  <span className="font-retro text-[10px]">
                    {colorLabel(game.turn).toUpperCase()}
                  </span>{" "}
                  •{" "}
                  <span className="font-retro text-[10px]">{statusText}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <RetroButton size="sm" onClick={onFlip}>
                    FLIP
                  </RetroButton>
                  <RetroButton size="sm" variant="danger" onClick={onNewGame}>
                    NEW
                  </RetroButton>
                </div>
              </div>

              <ChessBoard
                fen={game.fen}
                orientation={
                  mode === "multiplayer" && yourColor ? yourColor : orientation
                }
                selected={selected}
                legalTargets={legalTargets}
                lastMove={game.lastMove}
                checkSquare={game.checkKingSquare}
                onSquareClick={onSquareClick}
              />
            </div>
          </Panel>
        </main>

        <aside className="flex flex-col gap-4">
          <Panel title="CLOCKS">
            <div className="grid grid-cols-2 gap-3">
              <Clock
                color="w"
                ms={game.clock.whiteMs}
                active={game.clock.running && game.turn === "w" && game.status.kind === "playing"}
              />
              <Clock
                color="b"
                ms={game.clock.blackMs}
                active={game.clock.running && game.turn === "b" && game.status.kind === "playing"}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <RetroButton
                size="sm"
                variant="secondary"
                onClick={() => game.resetClocks(1 * 60 * 1000)}
              >
                1 MIN
              </RetroButton>
              <RetroButton
                size="sm"
                variant="secondary"
                onClick={() => game.resetClocks(3 * 60 * 1000)}
              >
                3 MIN
              </RetroButton>
              <RetroButton
                size="sm"
                variant="secondary"
                onClick={() => game.resetClocks(5 * 60 * 1000)}
              >
                5 MIN
              </RetroButton>
              <RetroButton
                size="sm"
                variant="secondary"
                onClick={() => game.resetClocks(10 * 60 * 1000)}
              >
                10 MIN
              </RetroButton>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <RetroButton size="sm" variant="primary" onClick={game.startClock}>
                START
              </RetroButton>
              <RetroButton size="sm" variant="secondary" onClick={game.pauseClock}>
                PAUSE
              </RetroButton>
            </div>
          </Panel>

          <Panel title="CONTROLS">
            <div className="flex flex-wrap gap-2">
              <RetroButton size="sm" onClick={onUndo}>
                UNDO
              </RetroButton>
              <RetroButton size="sm" onClick={onRedo}>
                REDO
              </RetroButton>
              <RetroButton size="sm" onClick={() => navigator.clipboard.writeText(game.exportFen())}>
                COPY FEN
              </RetroButton>
              <RetroButton size="sm" onClick={() => navigator.clipboard.writeText(game.exportPgn())}>
                COPY PGN
              </RetroButton>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <RetroButton size="sm" onClick={onSaveLocal}>
                SAVE LOCAL
              </RetroButton>
              <RetroButton size="sm" onClick={onLoadLocal}>
                LOAD LOCAL
              </RetroButton>
            </div>

            <div className="mt-3">
              <div className="mb-2 text-xs text-[var(--muted)]">
                Server save/load (backend endpoints may not exist yet):
              </div>
              <div className="flex gap-2">
                <input
                  value={serverGameId}
                  onChange={(e) => setServerGameId(e.target.value)}
                  placeholder="game id"
                  className="retro-border w-full rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
                />
                <RetroButton size="sm" onClick={onLoadServer}>
                  LOAD
                </RetroButton>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <RetroButton size="sm" onClick={onSaveServer}>
                  SAVE SERVER
                </RetroButton>
                <RetroButton size="sm" onClick={onCheckBackend}>
                  PING API
                </RetroButton>
                <span className="self-center text-xs text-[var(--muted)]">
                  API: <span className="font-retro text-[10px]">{serverStatus.toUpperCase()}</span>
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="MOVES">
            <MoveHistory moves={game.history} />
          </Panel>

          <Panel title="MULTIPLAYER">
            <div className="text-xs text-[var(--muted)]">
              Status:{" "}
              <span className="font-retro text-[10px]">
                {multiplayer.connection.kind.toUpperCase()}
              </span>
              {multiplayer.yourColor ? (
                <>
                  {" "}
                  • You:{" "}
                  <span className="font-retro text-[10px]">
                    {colorLabel(multiplayer.yourColor as Color).toUpperCase()}
                  </span>
                </>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2">
              <input
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="room id (e.g. neon-123)"
                className="retro-border rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--muted)]">Color</label>
                <select
                  value={colorPref}
                  onChange={(e) => setColorPref(e.target.value as "random" | "w" | "b")}
                  className="retro-border rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  <option value="random">Random</option>
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <RetroButton size="sm" variant="primary" onClick={onJoinRoom}>
                  JOIN
                </RetroButton>
                <RetroButton size="sm" variant="secondary" onClick={onLeaveRoom} disabled={!multiplayer.roomId}>
                  LEAVE
                </RetroButton>
              </div>

              <div className="text-xs text-[var(--muted)]">
                Room:{" "}
                <span className="font-retro text-[10px]">
                  {multiplayer.roomId ? multiplayer.roomId.toUpperCase() : "NONE"}
                </span>
              </div>
            </div>
          </Panel>
        </aside>
      </div>

      <PromotionModal
        open={promotionOpen}
        color={pendingPromotion?.color ?? "w"}
        onPick={onPickPromotion}
        onClose={onClosePromotion}
      />
    </div>
  );
}
