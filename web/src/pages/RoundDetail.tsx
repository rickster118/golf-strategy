import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { formatName, vsPar } from "../format";
import { usePlayer } from "../player";
import type { HoleScore, RoundDetail as Round } from "../types";

export default function RoundDetail() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { players, setPlayerId } = usePlayer();
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .round(id)
      .then((r) => {
        setPlayerId(r.playerId);
        setRound(r);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function remove() {
    if (!confirm("Delete this round?")) return;
    await api.deleteRound(id);
    nav("/rounds");
  }

  if (error) return <p className="error">{error}</p>;
  if (!round) return <p className="muted">Loading…</p>;

  const played = round.holes.filter((h) => h.strokes != null);
  const playedGross = played.reduce((sum, h) => sum + (h.strokes as number), 0);
  const playedPar = played.reduce((sum, h) => sum + h.par, 0);
  const adjusted =
    played.length === 18
      ? played.reduce((sum, h) => sum + Math.min(h.strokes as number, h.par + 2 + h.strokesReceived), 0)
      : null;

  return (
    <>
      <p className="muted">
        <Link to="/rounds">Rounds</Link> / {round.playedOn}
      </p>
      <h1>
        {played.length ? playedGross : "No scores"}{" "}
        {adjusted != null && adjusted !== playedGross ? <span className="cap">({adjusted})</span> : null}{" "}
        <span className="muted">
          {vsPar(played.length ? playedGross - playedPar : null)}
          {played.length === 18 ? "" : ` · ${played.length} holes`} · {round.points} pts
        </span>
      </h1>
      <p className="sub">
        {players.find((p) => p.id === round.playerId)?.name ?? "Player"} · {round.tee} tees · {formatName(round.format)} · index {round.handicapIndex.toFixed(1)} · course
        handicap {round.playingHandicap}
        {round.front9Gross != null && round.back9Gross != null
          ? ` · out ${round.front9Gross} / in ${round.back9Gross}`
          : ""}
      </p>
      {round.notes ? <p>{round.notes}</p> : null}
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <Link className="btn secondary" to={`/rounds/${id}/edit`} style={{ display: "inline-block" }}>
          Edit
        </Link>
        <button className="btn danger" onClick={remove}>
          Delete
        </button>
      </div>
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>SI</th>
              <th>Yds</th>
              <th>Gross</th>
              <th>Rec</th>
              <th>Net</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {round.holes.map((h) => (
              <tr key={h.hole}>
                <td>
                  <Link to={`/holes/${h.hole}`}>{h.hole}</Link>
                </td>
                <td>{h.par}</td>
                <td>{h.strokeIndex}</td>
                <td>{h.yards}</td>
                <td>
                  {h.strokes ?? ""}
                  {h.strokes != null && h.strokes > h.par + 2 + h.strokesReceived ? (
                    <span className="cap"> ({h.par + 2 + h.strokesReceived})</span>
                  ) : null}
                </td>
                <td>{h.strokes == null ? "" : h.strokesReceived || ""}</td>
                <td>{h.strokes == null ? "" : (h.net ?? "")}</td>
                <td>{h.strokes == null ? "" : h.points}</td>
              </tr>
            ))}
            <SummaryRow label="Out" holes={round.holes.filter((h) => h.hole <= 9)} />
            <SummaryRow label="In" holes={round.holes.filter((h) => h.hole >= 10)} />
            <SummaryRow label="Total" holes={round.holes} />
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryRow({ label, holes }: { label: string; holes: HoleScore[] }) {
  const played = holes.filter((h) => h.strokes != null);
  const par = played.reduce((s, h) => s + h.par, 0);
  const yards = played.reduce((s, h) => s + h.yards, 0);
  const gross = played.reduce((s, h) => s + (h.strokes as number), 0);
  const adjusted = played.reduce(
    (s, h) => s + Math.min(h.strokes as number, h.par + 2 + h.strokesReceived),
    0,
  );
  const received = played.reduce((s, h) => s + h.strokesReceived, 0);
  const net = played.reduce((s, h) => s + (h.net ?? 0), 0);
  const points = played.reduce((s, h) => s + h.points, 0);
  if (!played.length) {
    return (
      <tr className="summary">
        <td>{label}</td>
        <td colSpan={7}>—</td>
      </tr>
    );
  }
  return (
    <tr className="summary">
      <td>{label}</td>
      <td>{par}</td>
      <td />
      <td>{yards}</td>
      <td>
        {gross}
        {adjusted !== gross ? <span className="cap"> ({adjusted})</span> : null}
        <span className="muted"> {vsPar(gross - par)}</span>
      </td>
      <td>{received}</td>
      <td>
        {net} <span className="muted">{vsPar(net - par)}</span>
      </td>
      <td>{points}</td>
    </tr>
  );
}
