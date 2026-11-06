import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { fmt, strategyClass, vsPar, vsSigned } from "../format";
import { useStats } from "../hooks";
import { usePlayer } from "../player";
import { downloadReport } from "../report";
import { SortHead, compareValues } from "../SortHead";
import type { HoleStats } from "../types";

type PlanSort = "hole" | "par" | "si" | "yds" | "avg" | "vs" | "shots" | "gap" | "plan";

export default function GamePlan() {
  const [tee, setTee] = useState("all");
  const [sort, setSort] = useState<PlanSort>("hole");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const nav = useNavigate();
  const { player } = usePlayer();
  const { stats, error } = useStats(tee);

  function onSort(column: PlanSort) {
    if (column === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setDir(column === "gap" ? "desc" : "asc");
    }
  }

  const holes = useMemo(() => {
    if (!stats) return [];
    const yards = (h: HoleStats) =>
      tee === "yellow" ? h.yardsYellow : tee === "blue" ? h.yardsBlue : h.yardsWhite;
    const value = (h: HoleStats): number | string | null => {
      if (sort === "hole") return h.number;
      if (sort === "par") return h.par;
      if (sort === "si") return h.strokeIndex;
      if (sort === "yds") return yards(h);
      if (sort === "avg") return h.avgGross;
      if (sort === "shots") return h.avgShots;
      if (sort === "gap") return h.avgVsShots;
      if (sort === "plan") return h.strategy;
      return h.avgVsPar;
    };
    return [...stats.holes].sort((a, b) => compareValues(value(a), value(b), dir) || a.number - b.number);
  }, [stats, sort, dir, tee]);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      if (!player) return;
      const [allStats, summaries] = await Promise.all([api.stats(player.id), api.rounds(player.id)]);
      const rounds = await Promise.all(summaries.map((r) => api.round(r.id)));
      downloadReport(allStats, rounds, player.name, summaries);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="actions" style={{ marginTop: 0 }}>
        <h1 style={{ marginRight: "auto" }}>Game plan</h1>
        <button className="btn" disabled={downloading} onClick={download}>
          {downloading ? "Preparing…" : "Download report"}
        </button>
      </div>
      <p className="sub">
        {player?.name ?? "This player"}’s plan uses the last 10 times each hole was played. Yardage stays the white card unless you filter a tee.
      </p>
      {downloadError ? <p className="error">{downloadError}</p> : null}
      <div className="filter-pills">
        {["all", "white", "yellow", "blue"].map((t) => (
          <button key={t} className={tee === t ? "on" : ""} onClick={() => setTee(t)}>
            {t === "all" ? "All tees" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <SortHead label="Hole" column="hole" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Par" column="par" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="SI" column="si" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Yds" column="yds" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Avg" column="avg" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Vs par" column="vs" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Shots Rec." column="shots" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Vs shots" column="gap" active={sort} dir={dir} onSort={onSort} />
              <SortHead label="Plan" column="plan" active={sort} dir={dir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {holes.map((h) => (
              <tr key={h.number} className="clickable" onClick={() => nav(`/holes/${h.number}`)}>
                <td>
                  <Link className="hole-link" to={`/holes/${h.number}`}>
                    {h.number}
                  </Link>
                </td>
                <td>{h.par}</td>
                <td>{h.strokeIndex}</td>
                <td>{tee === "yellow" ? h.yardsYellow : tee === "blue" ? h.yardsBlue : h.yardsWhite}</td>
                <td>{fmt(h.avgGross)}</td>
                <td>{vsPar(h.avgVsPar != null ? Number(h.avgVsPar.toFixed(1)) : null)}</td>
                <td>{fmt(h.avgShots)}</td>
                <td>{vsSigned(h.avgVsShots)}</td>
                <td>
                  <span className={`chip ${strategyClass(h.strategy)}`}>{h.strategy}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="key">
        <div>
          <dt>Vs par</dt>
          <dd>= average against par</dd>
        </div>
        <div>
          <dt>Shots Rec.</dt>
          <dd>= average shots received on that hole</dd>
        </div>
        <div>
          <dt>Vs shots</dt>
          <dd>= average compared with Shots Rec. A minus is better</dd>
        </div>
        <div>
          <dt>Play to handicap</dt>
          <dd>= between −0.3 and +0.5</dd>
        </div>
        <div>
          <dt>Attack</dt>
          <dd>= −0.3 or better than Shots Rec.</dd>
        </div>
        <div>
          <dt>Survival</dt>
          <dd>= +0.5 or worse than Shots Rec.</dd>
        </div>
      </dl>
    </>
  );
}
