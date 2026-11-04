import type {
  Course,
  Defaults,
  HoleHistoryPoint,
  Player,
  RoundDetail,
  RoundIn,
  RoundSummary,
  Stats,
} from "./types";

function playerQuery(playerId: number, extra?: Record<string, string | undefined>): string {
  const q = new URLSearchParams({ player: String(playerId) });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) q.set(key, value);
    }
  }
  return q.toString();
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  course: () => req<Course>("/api/course"),
  players: () => req<Player[]>("/api/players"),
  defaults: (playerId: number) => req<Defaults>(`/api/defaults?${playerQuery(playerId)}`),
  stats: (playerId: number, tee?: string) =>
    req<Stats>(`/api/stats?${playerQuery(playerId, { tee: tee && tee !== "all" ? tee : undefined })}`),
  holeHistory: (hole: number, playerId: number, tee?: string) =>
    req<HoleHistoryPoint[]>(
      `/api/holes/${hole}/history?${playerQuery(playerId, { tee: tee && tee !== "all" ? tee : undefined })}`,
    ),
  rounds: (playerId: number) => req<RoundSummary[]>(`/api/rounds?${playerQuery(playerId)}`),
  round: (id: number) => req<RoundDetail>(`/api/rounds/${id}`),
  createRound: (body: RoundIn) =>
    req<RoundDetail>("/api/rounds", { method: "POST", body: JSON.stringify(body) }),
  updateRound: (id: number, body: RoundIn) =>
    req<RoundDetail>(`/api/rounds/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteRound: (id: number) =>
    req<void>(`/api/rounds/${id}`, { method: "DELETE" }),
};
