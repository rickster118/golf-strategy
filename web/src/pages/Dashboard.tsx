import { useState } from "react";
import { Link } from "react-router-dom";
import { fmt, formatName, vsPar } from "../format";
import { useStats } from "../hooks";
import { usePlayer } from "../player";

export default function Dashboard() {
  const [tee, setTee] = useState("all");
  const { player } = usePlayer();
  const { stats, error } = useStats(tee);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  const last = stats.lastRound;

  return (
    <>
      <h1>{player ? `${player.name}` : "Dashboard"}</h1>
      <p className="sub">Scores and averages are only this player’s. The course card is shared.</p>
      <div className="filter-pills">
        {["all", "white", "yellow", "blue"].map((t) => (
          <button key={t} className={tee === t ? "on" : ""} onClick={() => setTee(t)}>
            {t === "all" ? "All tees" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid stats-row">
        <div className="card">
          <div className="label">Rounds</div>
          <div className="value">{stats.roundCount}</div>
        </div>
        <div className="card">
          <div className="label">Avg gross</div>
          <div className="value">{fmt(stats.avgGross)}</div>
          <div className="hint">{stats.completeGrossCount} complete 18s</div>
        </div>
        <div className="card">
          <div className="label">Best / worst</div>
          <div className="value">
            {stats.bestGross ?? "—"}
            <span className="muted"> / {stats.worstGross ?? "—"}</span>
          </div>
        </div>
        <div className="card">
          <div className="label">Avg points</div>
          <div className="value">{fmt(stats.avgPoints)}</div>
          <div className="hint">Best {stats.bestPoints ?? "—"}</div>
        </div>
        <div className="card">
          <div className="label">Front / back</div>
          <div className="value">
            {fmt(stats.avgFront9)}
            <span className="muted"> / {fmt(stats.avgBack9)}</span>
          </div>
        </div>
      </div>

      <h2>Last round</h2>
      {last ? (
        <Link to={`/rounds/${last.id}`} className="card" style={{ display: "block" }}>
          <div className="label">
            {last.playedOn} · {last.tee} · {formatName(last.format)} · HI {last.handicapIndex.toFixed(1)} · CH{" "}
            {last.playingHandicap}
          </div>
          <div className="value">
            {last.holesCompleted === 18 ? last.gross : `${last.playedGross}`}{" "}
            <span className="muted">
              {vsPar(last.holesCompleted === 18 ? last.vsPar : last.playedVsPar)}
              {last.holesCompleted === 18 ? "" : ` · ${last.holesCompleted} holes`}
            </span>
            <span className="muted"> · {last.points} pts</span>
            {last.pickedUpCount ? (
              <span className="muted"> · {last.pickedUpCount} pick-up</span>
            ) : null}
          </div>
        </Link>
      ) : (
        <p className="empty">
          No rounds yet. <Link to="/log">Log this week’s card.</Link>
        </p>
      )}

      <h2>Problem holes</h2>
      <p className="sub">Hole form uses the last 10 times each hole was played. Round totals above use every complete round.</p>
      <HolePills holes={stats.problemHoles} all={stats.holes} />
      <h2>Scoring holes</h2>
      <HolePills holes={stats.scoringHoles} all={stats.holes} />
    </>
  );
}

function HolePills({
  holes,
  all,
}: {
  holes: number[];
  all: { number: number; par: number; avgVsPar: number | null; strategy: string }[];
}) {
  if (!holes.length) return <p className="empty">Need at least two completed scores on a hole.</p>;
  return (
    <div className="grid hole-grid">
      {holes.map((n) => {
        const h = all.find((x) => x.number === n);
        return (
          <Link key={n} to={`/holes/${n}`} className="card hole-card">
            <div className="n">Hole {n} · par {h?.par}</div>
            <div className="value" style={{ fontSize: 20 }}>
              {h?.avgVsPar != null ? vsPar(Number(h.avgVsPar.toFixed(1))) : "—"}
            </div>
            <span className="chip">{h?.strategy}</span>
          </Link>
        );
      })}
    </div>
  );
}
