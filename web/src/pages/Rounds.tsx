import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatName, vsPar } from "../format";
import { usePlayer } from "../player";
import type { RoundSummary } from "../types";

export default function Rounds() {
  const [rounds, setRounds] = useState<RoundSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { player } = usePlayer();
  const nav = useNavigate();

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
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Tee</th>
              <th>Format</th>
              <th>HI</th>
              <th>CH</th>
              <th>Gross</th>
              <th>Vs par</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav(`/rounds/${r.id}`)}>
                <td>{r.playedOn}</td>
                <td>{r.tee}</td>
                <td>{formatName(r.format)}</td>
                <td>{r.handicapIndex.toFixed(1)}</td>
                <td>{r.playingHandicap}</td>
                <td>
                  {r.holesCompleted === 18
                    ? r.gross
                    : `${r.playedGross} (${r.holesCompleted} holes)`}
                </td>
                <td>{vsPar(r.holesCompleted === 18 ? r.vsPar : r.playedVsPar)}</td>
                <td>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
