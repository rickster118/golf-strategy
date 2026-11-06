import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatName, vsPar } from "../format";
import { usePlayer } from "../player";
import { SortHead, compareValues } from "../SortHead";
import type { RoundSummary } from "../types";

type RoundSort = "date" | "tee" | "format" | "hi" | "ch" | "score" | "holes" | "vs" | "pts" | "pph";
const LIMITS = [10, 20, 50];

function pointsPerHole(r: RoundSummary): number | null {
  if (!r.holesCompleted) return null;
  return r.points / r.holesCompleted;
}

export default function Rounds() {
  const [rounds, setRounds] = useState<RoundSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<RoundSort>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const { player } = usePlayer();
  const nav = useNavigate();

  function onSort(column: RoundSort) {
    if (column === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setDir(column === "date" || column === "pph" ? "desc" : "asc");
    }
  }

  const shown = useMemo(() => {
    if (!rounds) return [];
    const latest = [...rounds].sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id - a.id).slice(0, limit);
    const value = (r: RoundSummary): number | string | null => {
      if (sort === "date") return r.playedOn;
      if (sort === "tee") return r.tee;
      if (sort === "format") return r.format;
      if (sort === "hi") return r.handicapIndex;
      if (sort === "ch") return r.playingHandicap;
      if (sort === "score") return r.playedGross;
      if (sort === "holes") return r.holesCompleted;
      if (sort === "pts") return r.points;
      if (sort === "pph") return pointsPerHole(r);
      return r.holesCompleted === 18 ? r.vsPar : r.playedVsPar;
    };
    return latest.sort((a, b) => compareValues(value(a), value(b), dir) || b.id - a.id);
  }, [rounds, limit, sort, dir]);

  useEffect(() => {
    if (!player) return;
    setRounds(null);
    api.rounds(player.id).then(setRounds).catch((e: Error) => setError(e.message));
  }, [player]);

  if (error) return <p className="error">{error}</p>;
  if (!rounds) return <p className="muted">Loading…</p>;
  if (!rounds.length) {
    return (
      <>
        <h1>Rounds</h1>
        <p className="empty">
          Nothing logged for {player?.name ?? "this player"}. <Link to="/log">Add a round.</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Rounds</h1>
      <div className="filter-pills">
        {LIMITS.map((n) => (
          <button key={n} className={limit === n ? "on" : ""} onClick={() => setLimit(n)}>
            Last {n}
          </button>
        ))}
      </div>
      <p className="sub">
        Showing {shown.length} of {rounds.length}. Click a column to sort. Date starts with the newest first.
      </p>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <SortHead label="Date" column="date" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Tee" column="tee" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Format" column="format" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="HI" column="hi" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="CH" column="ch" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Score" column="score" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Holes" column="holes" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Vs par" column="vs" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Pts" column="pts" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Pts/hole" column="pph" active={sort} dir={dir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav(`/rounds/${r.id}`)}>
                <td>{r.playedOn}</td>
                <td>{r.tee}</td>
                <td>{formatName(r.format)}</td>
                <td>{r.handicapIndex.toFixed(1)}</td>
                <td>{r.playingHandicap}</td>
                <td>
                  {r.playedGross}
                  {r.playedAdjusted !== r.playedGross ? (
                    <span className="cap"> ({r.playedAdjusted})</span>
                  ) : null}
                </td>
                <td>{r.holesCompleted}</td>
                <td>{vsPar(r.holesCompleted === 18 ? r.vsPar : r.playedVsPar)}</td>
                <td>{r.points}</td>
                <td>{pointsPerHole(r)?.toFixed(3) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
