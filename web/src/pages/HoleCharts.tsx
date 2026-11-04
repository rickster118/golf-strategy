import { vsPar } from "../format";
import type { HoleHistoryPoint, HoleStats } from "../types";

export function TrendChart({ points }: { points: HoleHistoryPoint[] }) {
  if (!points.length) {
    return <p className="empty">No scores on this hole yet.</p>;
  }

  const w = 640;
  const h = 220;
  const pad = { l: 36, r: 16, t: 18, b: 42 };
  const values = points.map((p) => p.vsPar);
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const x = (i: number) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.t + ((max - v) / (max - min)) * innerH;

  let sum = 0;
  const avg = points.map((p, i) => {
    sum += p.vsPar;
    return sum / (i + 1);
  });
  const line = avg.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const showDates = points.length <= 12;
  const ticks = [];
  for (let v = Math.ceil(min); v <= Math.floor(max); v += 1) ticks.push(v);

  return (
    <svg className="trend" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Vs par over time">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? "par-line" : "grid-line"} />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="axis">
            {vsPar(v)}
          </text>
        </g>
      ))}
      <path d={line} className="avg-line" />
      {points.map((p, i) => (
        <g key={p.roundId}>
          <circle cx={x(i)} cy={y(p.vsPar)} r={5.5} className={dotClass(p.vsPar)}>
            <title>
              {p.playedOn} · {p.tee} · {p.strokes} ({vsPar(p.vsPar)}) · running avg {vsPar(Number(avg[i].toFixed(1)))}
            </title>
          </circle>
          {showDates ? (
            <text x={x(i)} y={h - 8} textAnchor="middle" className="axis date">
              {shortDate(p.playedOn)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function dotClass(vs: number): string {
  if (vs <= -1) return "dot good";
  if (vs === 0) return "dot even";
  if (vs === 1) return "dot bogey";
  return "dot bad";
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export function ScoreMix({ hole }: { hole: HoleStats }) {
  const rows = [
    { label: "Birdie+", n: hole.birdiesOrBetter, tone: "good" },
    { label: "Par", n: hole.pars, tone: "even" },
    { label: "Bogey", n: hole.bogeys, tone: "bogey" },
    { label: "Double+", n: hole.doublesPlus, tone: "bad" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="mix">
      {rows.map((r) => (
        <div className="mix-row" key={r.label}>
          <span className="mix-label">{r.label}</span>
          <span className="mix-track">
            <span className={`mix-bar ${r.tone}`} style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="mix-n">{r.n}</span>
        </div>
      ))}
    </div>
  );
}
