import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Player } from "./types";

const KEY = "golf-player-id";

type PlayerState = {
  players: Player[];
  player: Player | null;
  error: string | null;
  setPlayerId: (id: number) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .players()
      .then((list) => {
        setPlayers(list);
        setPlayerIdState((cur) => {
          if (cur && list.some((p) => p.id === cur)) return cur;
          const ricki = list.find((p) => p.name === "Ricki") ?? list[0];
          if (ricki) localStorage.setItem(KEY, String(ricki.id));
          return ricki?.id ?? null;
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const setPlayerId = useCallback((id: number) => {
    localStorage.setItem(KEY, String(id));
    setPlayerIdState(id);
  }, []);

  const player = players.find((p) => p.id === playerId) ?? null;

  return (
    <PlayerContext.Provider value={{ players, player, error, setPlayerId }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
