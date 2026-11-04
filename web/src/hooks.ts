import { useEffect, useState } from "react";
import { api } from "./api";
import { usePlayer } from "./player";
import type { Course, Stats } from "./types";

export function useCourse() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.course().then(setCourse).catch((e: Error) => setError(e.message));
  }, []);
  return { course, error };
}

export function useStats(tee: string) {
  const { player } = usePlayer();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!player) return;
    setStats(null);
    api
      .stats(player.id, tee === "all" ? undefined : tee)
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, [tee, player]);
  return { stats, error };
}
