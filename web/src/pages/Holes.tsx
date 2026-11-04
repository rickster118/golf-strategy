import { useState } from "react";
import { Link } from "react-router-dom";
import { fmt, strategyClass, vsPar } from "../format";
import { useStats } from "../hooks";

export default function Holes() {
  const [tee, setTee] = useState("all");
  const { stats, error } = useStats(tee);
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Holes</h1>
      <p className="sub">Each average is the last 10 times that hole was played. Colour follows vs par over those rounds.</p>
      <div className="filter-pills">
        {["all", "white", "yellow", "blue"].map((t) => (
          <button key={t} className={tee === t ? "on" : ""} onClick={() => setTee(t)}>
            {t === "all" ? "All tees" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid hole-grid">
        {stats.holes.map((h) => {
          const v = h.avgVsPar;
          const tone = v == null ? "" : v >= 1.5 ? "bad" : v <= 0.35 ? "good" : "warn";
          return (
            <Link key={h.number} to={`/holes/${h.number}`} className="card hole-card">
              <div className="n">
                {h.number} · par {h.par} · SI {h.strokeIndex}
              </div>
              <div className={`value ${tone}`} style={{ fontSize: 22 }}>
                {fmt(h.avgGross)}
              </div>
              <div className="muted">{vsPar(h.avgVsPar != null ? Number(h.avgVsPar.toFixed(1)) : null)}</div>
              <span className={`chip ${strategyClass(h.strategy)}`}>{h.strategy}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
