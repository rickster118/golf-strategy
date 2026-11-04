import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { courseHandicap, netDouble, today, vsPar, yardsFor } from "../format";
import { useCourse } from "../hooks";
import { usePlayer } from "../player";
import type { Course, HoleIn, RoundIn, TeeId } from "../types";

type Row = { hole: number; strokes: string };

function emptyRows(course: Course): Row[] {
  return course.holes.map((h) => ({ hole: h.number, strokes: "" }));
}

export default function LogRound() {
  const { course, error: courseError } = useCourse();
  const { player, setPlayerId } = usePlayer();
  const nav = useNavigate();
  const editId = useParams().id ? Number(useParams().id) : null;
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [playedOn, setPlayedOn] = useState(today());
  const [tee, setTee] = useState<TeeId>("white");
  const [format, setFormat] = useState("stableford");
  const [index, setIndex] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);

  useEffect(() => {
    if (!course || !editId) return;
    api
      .round(editId)
      .then((r) => {
        setOwnerId(r.playerId);
        setPlayerId(r.playerId);
        setPlayedOn(r.playedOn);
        setTee(r.tee);
        setFormat(r.format);
        setIndex(String(r.handicapIndex));
        setRows(
          r.holes.map((h) => ({
            hole: h.hole,
            strokes: h.strokes == null ? "" : String(h.strokes),
          })),
        );
      })
      .catch((e: Error) => setError(e.message));
  }, [course, editId, setPlayerId]);

  useEffect(() => {
    if (!course || editId || !player) return;
    setOwnerId(player.id);
    api
      .defaults(player.id)
      .then((d) => {
        setTee(d.tee);
        setFormat(d.format);
        if (d.handicapIndex != null) setIndex(String(d.handicapIndex));
        else setIndex("");
      })
      .catch(() => undefined);
    setRows(emptyRows(course));
  }, [course, editId, player]);

  const indexNum = index.trim() === "" || Number.isNaN(Number(index)) ? null : Number(index);
  const teeCard = course?.tees.find((t) => t.id === tee);
  const playing =
    course && indexNum != null && teeCard?.courseRating != null && teeCard.slopeRating != null
      ? courseHandicap(indexNum, teeCard.slopeRating, teeCard.courseRating, course.par)
      : null;

  const tally = useMemo(() => {
    if (!course || !rows) return null;
    const scored = rows
      .map((r) => {
        const card = course.holes.find((h) => h.number === r.hole)!;
        const n = r.strokes === "" ? null : Number(r.strokes);
        const cap = playing == null ? null : netDouble(card.par, playing, card.strokeIndex);
        const adjusted = n == null || cap == null ? n : Math.min(n, cap);
        return { hole: r.hole, par: card.par, strokes: n, adjusted };
      })
      .filter((r) => r.strokes != null && !Number.isNaN(r.strokes));
    const gross = scored.reduce((s, r) => s + (r.strokes as number), 0);
    const adjusted = scored.reduce((s, r) => s + (r.adjusted as number), 0);
    const par = scored.reduce((s, r) => s + r.par, 0);
    const nine = (from: number, to: number) => {
      const slice = scored.filter((r) => r.hole >= from && r.hole <= to);
      if (slice.length !== 9) return null;
      return {
        gross: slice.reduce((s, r) => s + (r.strokes as number), 0),
        adjusted: slice.reduce((s, r) => s + (r.adjusted as number), 0),
      };
    };
    return {
      count: scored.length,
      gross,
      adjusted,
      vs: scored.length ? gross - par : null,
      vsAdjusted: scored.length ? adjusted - par : null,
      out: nine(1, 9),
      inn: nine(10, 18),
    };
  }, [course, rows, playing]);

  function setStroke(hole: number, strokes: string) {
    setRows((cur) => cur?.map((r) => (r.hole === hole ? { ...r, strokes } : r)) ?? null);
  }

  function focusHole(hole: number) {
    inputs.current[hole - 1]?.focus();
    inputs.current[hole - 1]?.select();
  }

  async function save() {
    if (!course || !rows) return;
    if (index.trim() === "" || Number.isNaN(Number(index))) {
      setError("Enter your handicap index");
      return;
    }
    if (playing == null) {
      setError("Enter your handicap index");
      return;
    }
    const missing = rows.filter((r) => r.strokes === "").length;
    if (missing === 18) {
      setError("Enter at least one score");
      focusHole(1);
      return;
    }
    const playerId = editId ? ownerId : player?.id;
    if (playerId == null) {
      setError("Choose a player");
      return;
    }
    const who = player?.name ?? "this player";
    if (missing > 0) {
      const ok = window.confirm(
        `${missing} hole${missing === 1 ? "" : "s"} have no score. Save this as an unfinished round for ${who}? The holes you filled in will count. It will not count as a full 18-hole total.`,
      );
      if (!ok) return;
    }
    const holes: HoleIn[] = rows.map((r) => ({
      hole: r.hole,
      strokes: r.strokes === "" ? null : Number(r.strokes),
      pickedUp: false,
      putts: null,
      fir: null,
      gir: null,
    }));
    const body: RoundIn = {
      playerId,
      playedOn,
      tee,
      format,
      handicapIndex: Number(index),
      playingHandicap: playing,
      notes: null,
      holes,
    };
    setSaving(true);
    setError(null);
    try {
      const saved = editId ? await api.updateRound(editId, body) : await api.createRound(body);
      nav(`/rounds/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (courseError) return <p className="error">{courseError}</p>;
  if (!course || !rows) return <p className="muted">Loading…</p>;

  const front = rows.slice(0, 9);
  const back = rows.slice(9);

  return (
    <>
      <h1>
        {editId ? "Edit round" : "Log round"}
        {player ? ` · ${player.name}` : ""}
      </h1>
      <p className="sub">
        Gross only. Leave a hole blank if you did not play it. If you picked up, type the net double. Tab or Enter moves to the next hole.
      </p>
      <div className="form-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
        </div>
        <div className="field">
          <label>Tee</label>
          <select value={tee} onChange={(e) => setTee(e.target.value as TeeId)}>
            <option value="white">White</option>
            <option value="yellow">Yellow</option>
            <option value="blue">Blue</option>
          </select>
        </div>
        <div className="field">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="stableford">Stableford</option>
            <option value="medal">Medal</option>
            <option value="rollup">Roll-up</option>
          </select>
        </div>
        <div className="field">
          <label>Handicap index</label>
          <input
            inputMode="decimal"
            value={index}
            onChange={(e) => setIndex(e.target.value)}
            placeholder="12.4"
          />
        </div>
        <div className="field">
          <label>Course handicap</label>
          <div className="value" style={{ fontSize: 22 }}>
            {playing ?? "—"}
          </div>
        </div>
      </div>

      <div className="nines">
        <Nine
          label="Out"
          rows={front}
          course={course}
          tee={tee}
          playing={playing}
          inputs={inputs}
          onChange={setStroke}
          onEnter={(hole) => focusHole(hole + 1)}
        />
        <Nine
          label="In"
          rows={back}
          course={course}
          tee={tee}
          playing={playing}
          inputs={inputs}
          onChange={setStroke}
          onEnter={(hole) => (hole < 18 ? focusHole(hole + 1) : undefined)}
        />
      </div>

      <div className="tally">
        <div>
          <div className="label muted">Running total</div>
          <div className="big">
            {tally?.count ? tally.gross : "—"}{" "}
            {tally?.count && tally.adjusted !== tally.gross ? (
              <span className="cap">({tally.adjusted})</span>
            ) : null}{" "}
            <span className="muted">{vsPar(tally?.vs ?? null)}</span>
          </div>
          <div className="muted">{tally?.count ?? 0} of 18 holes</div>
        </div>
        <div>
          <div className="label muted">Out</div>
          <div className="big">
            {tally?.out ? (
              <>
                {tally.out.gross}{" "}
                {tally.out.adjusted !== tally.out.gross ? (
                  <span className="cap">({tally.out.adjusted})</span>
                ) : null}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
        <div>
          <div className="label muted">In</div>
          <div className="big">
            {tally?.inn ? (
              <>
                {tally.inn.gross}{" "}
                {tally.inn.adjusted !== tally.inn.gross ? (
                  <span className="cap">({tally.inn.adjusted})</span>
                ) : null}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button className="btn" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save round"}
        </button>
        <Link className="btn secondary" to={editId ? `/rounds/${editId}` : "/"}>
          Cancel
        </Link>
      </div>
    </>
  );
}

function Nine({
  label,
  rows,
  course,
  tee,
  playing,
  inputs,
  onChange,
  onEnter,
}: {
  label: string;
  rows: Row[];
  course: Course;
  tee: TeeId;
  playing: number | null;
  inputs: MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (hole: number, strokes: string) => void;
  onEnter: (hole: number) => void;
}) {
  return (
    <div>
      <div className="nine-label">{label}</div>
      <div className="score-grid">
        {rows.map((r) => {
          const card = course.holes.find((h) => h.number === r.hole)!;
          const yds = yardsFor(card.yards, tee);
          const score = r.strokes === "" ? null : Number(r.strokes);
          const cap = playing == null ? null : netDouble(card.par, playing, card.strokeIndex);
          const over = score != null && cap != null && score > cap;
          return (
            <label className="score-box" key={r.hole}>
              <span className="hole-no">{r.hole}</span>
              <input
                ref={(el) => {
                  inputs.current[r.hole - 1] = el;
                }}
                inputMode="numeric"
                value={r.strokes}
                aria-label={`Hole ${r.hole}`}
                onChange={(e) => onChange(r.hole, e.target.value.replace(/\D/g, "").slice(0, 2))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onEnter(r.hole);
                  }
                }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <span className="cap">{over ? `(${cap})` : ""}</span>
              <span className="par">
                par {card.par} · {yds}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
