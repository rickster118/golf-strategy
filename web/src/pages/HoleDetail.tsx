import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmt, strategyClass, vsPar } from "../format";
import { useStats } from "../hooks";
import { usePlayer } from "../player";
import type { HoleHistoryPoint } from "../types";
import { ScoreMix, TrendChart } from "./HoleCharts";

export default function HoleDetail() {
  const n = Number(useParams().n);
  const [tee, setTee] = useState("all");
  const { player } = usePlayer();
  const { stats, error } = useStats(tee);
  const [history, setHistory] = useState<HoleHistoryPoint[] | null>(null);
  const h = stats?.holes.find((x) => x.number === n);

  useEffect(() => {
    setHistory(null);
    if (!player) return;
    api
      .holeHistory(n, player.id, tee)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [n, tee, player]);

  if (error) return <p className="error">{error}</p>;
  if (!stats || !h) return <p className="muted">Loading…</p>;

  const yards =
    tee === "yellow" ? h.yardsYellow : tee === "blue" ? h.yardsBlue : tee === "white" ? h.yardsWhite : `${h.yardsWhite} / ${h.yardsYellow} / ${h.yardsBlue}`;

  return (
    <>
      <p className="muted">
        <Link to="/holes">Holes</Link> / {n}
      </p>
      <h1>
        Hole {n} <span className="muted">par {h.par}</span>
      </h1>
      <p className="sub">
        SI {h.strokeIndex} · {yards} yds ·{" "}
        {h.played >= 10
          ? "last 10 times played"
          : `${h.played} times played so far — the last 10 are used once there are more`}
      </p>
      <div className="filter-pills">
        {["all", "white", "yellow", "blue"].map((t) => (
          <button key={t} className={tee === t ? "on" : ""} onClick={() => setTee(t)}>
            {t === "all" ? "All tees" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <p>
        <span className={`chip ${strategyClass(h.strategy)}`}>{h.strategy}</span>
      </p>
      <div className="charts">
        <div className="card">
          <div className="label">Vs par over time</div>
          <p className="hint">The last 10 times this hole was played, oldest on the left. The line is the running average of those dots.</p>
          {history ? <TrendChart points={history} /> : <p className="muted">Loading…</p>}
        </div>
        <div className="card">
          <div className="label">Score mix</div>
          <p className="hint">Birdies, pars, bogeys, and doubles from those same rounds.</p>
          <ScoreMix hole={h} />
        </div>
      </div>
      <div className="grid stats-row">
        <Stat label="Played" value={h.played} />
        <Stat label="Completed" value={h.completed} hint={`${h.pickups} pick-ups`} />
        <Stat label="Avg gross" value={fmt(h.avgGross)} />
        <Stat label="Vs par" value={vsPar(h.avgVsPar != null ? Number(h.avgVsPar.toFixed(1)) : null)} />
        <Stat label="Best / worst" value={`${h.best ?? "—"} / ${h.worst ?? "—"}`} />
        <Stat label="Avg points" value={fmt(h.avgPoints)} />
        <Stat label="Birdie+" value={h.birdiesOrBetter} />
        <Stat label="Par" value={h.pars} />
        <Stat label="Bogey" value={h.bogeys} />
        <Stat label="Double+" value={h.doublesPlus} />
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 22 }}>
        {value}
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
