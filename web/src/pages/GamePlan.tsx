import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { fmt, strategyClass, vsPar } from "../format";
import { useStats } from "../hooks";
import { usePlayer } from "../player";
import { downloadReport } from "../report";

export default function GamePlan() {
  const [tee, setTee] = useState("all");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const nav = useNavigate();
  const { player } = usePlayer();
  const { stats, error } = useStats(tee);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      if (!player) return;
      const [allStats, summaries] = await Promise.all([api.stats(player.id), api.rounds(player.id)]);
      const rounds = await Promise.all(summaries.map((r) => api.round(r.id)));
      downloadReport(allStats, rounds, player.name);
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
        {player?.name ?? "This player"}’s plan uses the last 10 times each hole was played. Older rounds stay in the log and are left out of these averages. Yardage stays the white card unless you filter a tee.
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
              <th>Hole</th>
              <th>Par</th>
              <th>SI</th>
              <th>Yds</th>
              <th>Avg</th>
              <th>Vs par</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {stats.holes.map((h) => (
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
                <td>
                  <span className={`chip ${strategyClass(h.strategy)}`}>{h.strategy}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
