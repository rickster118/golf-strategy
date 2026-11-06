import { useState } from "react";
import { Link } from "react-router-dom";
import { fmt, strategyClass, vsSigned } from "../format";
import { useStats } from "../hooks";

export default function Holes() {
  const [tee, setTee] = useState("all");
  const { stats, error } = useStats(tee);
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Holes</h1>
      <p className="sub">
        Each average is the last 10 times that hole was played. Attack is −0.3 or better than the shots received. Survival is +0.5 or worse. Between those is play to handicap.
      </p>
      <div className="filter-pills">
        {["all", "white", "yellow", "blue"].map((t) => (
          <button key={t} className={tee === t ? "on" : ""} onClick={() => setTee(t)}>
            {t === "all" ? "All tees" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid hole-grid">
        {stats.holes.map((h) => {
          const tone =
            h.strategy === "Attack" ? "good" : h.strategy === "Survival" ? "bad" : h.strategy === "Play to handicap" ? "warn" : "";
          return (
            <Link key={h.number} to={`/holes/${h.number}`} className="card hole-card">
              <div className="n">
                {h.number} · par {h.par} · SI {h.strokeIndex}
              </div>
              <div className={`value ${tone}`} style={{ fontSize: 22 }}>
                {fmt(h.avgGross)}
              </div>
              <div className="muted">{vsSigned(h.avgVsShots)} vs shots</div>
              <span className={`chip ${strategyClass(h.strategy)}`}>{h.strategy}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
