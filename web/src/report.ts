import { fmt, formatName, strategyClass, vsPar } from "./format";
import type { HoleHistoryPoint, HoleStats, RoundDetail, Stats } from "./types";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function historyFor(hole: number, rounds: RoundDetail[]): HoleHistoryPoint[] {
  const played = [...rounds]
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.id - b.id)
    .flatMap((round) => {
      const holeScore = round.holes.find((h) => h.hole === hole);
      if (!holeScore || holeScore.strokes == null || holeScore.vsPar == null) return [];
      return [
        {
          roundId: round.id,
          playedOn: round.playedOn,
          tee: round.tee,
          strokes: holeScore.strokes,
          vsPar: holeScore.vsPar,
          points: holeScore.points,
        },
      ];
    });
  return played.slice(-10);
}

function trendSvg(points: HoleHistoryPoint[]): string {
  if (!points.length) return `<p class="empty">No scores on this hole yet.</p>`;
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
  const ticks: number[] = [];
  for (let v = Math.ceil(min); v <= Math.floor(max); v += 1) ticks.push(v);
  const showDates = points.length <= 12;
  const grid = ticks
    .map(
      (v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? "par-line" : "grid-line"}"/>
        <text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${esc(vsPar(v))}</text>`,
    )
    .join("");
  const dots = points
    .map((p, i) => {
      const tone = p.vsPar <= -1 ? "#5fd2a0" : p.vsPar === 0 ? "#c5cedd" : p.vsPar === 1 ? "#e6c36a" : "#f07a7a";
      const date =
        showDates
          ? `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="axis">${esc(shortDate(p.playedOn))}</text>`
          : "";
      return `<circle cx="${x(i)}" cy="${y(p.vsPar)}" r="5.5" fill="${tone}" stroke="#0c0e12" stroke-width="1.5">
        <title>${esc(p.playedOn)} · ${esc(p.tee)} · ${p.strokes} (${esc(vsPar(p.vsPar))})</title>
      </circle>${date}`;
    })
    .join("");
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" role="img">${grid}<path d="${line}" class="avg-line"/>${dots}</svg>`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function scoreMix(hole: HoleStats): string {
  const rows = [
    ["Birdie+", hole.birdiesOrBetter, "good"],
    ["Par", hole.pars, "even"],
    ["Bogey", hole.bogeys, "bogey"],
    ["Double+", hole.doublesPlus, "bad"],
  ] as const;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return `<div class="mix">${rows
    .map(
      ([label, n, tone]) => `<div class="mix-row">
        <span>${label}</span>
        <span class="mix-track"><span class="mix-bar ${tone}" style="width:${(n / max) * 100}%"></span></span>
        <span class="mix-n">${n}</span>
      </div>`,
    )
    .join("")}</div>`;
}

function holeSection(hole: HoleStats, rounds: RoundDetail[]): string {
  return `<section class="block" id="hole-${hole.number}">
    <h2>Hole ${hole.number} <span class="muted">par ${hole.par}</span></h2>
    <p class="sub">SI ${hole.strokeIndex} · ${hole.yardsWhite} yds white · last 10 plays · avg ${esc(fmt(hole.avgGross))} (${esc(vsPar(hole.avgVsPar != null ? Number(hole.avgVsPar.toFixed(1)) : null))})</p>
    <span class="chip ${strategyClass(hole.strategy)}">${esc(hole.strategy)}</span>
    <div class="charts">
      <div class="card"><div class="label">Vs par over time</div>${trendSvg(historyFor(hole.number, rounds))}</div>
      <div class="card"><div class="label">Score mix</div>${scoreMix(hole)}</div>
    </div>
  </section>`;
}

export function buildReport(stats: Stats, rounds: RoundDetail[], playerName: string): string {
  const generated = new Date().toISOString().slice(0, 16).replace("T", " ");
  const last = stats.lastRound;
  const plan = stats.holes
    .map(
      (h) => `<tr>
        <td><a class="hole-link" href="#hole-${h.number}">${h.number}</a></td>
        <td>${h.par}</td><td>${h.strokeIndex}</td><td>${h.yardsWhite}</td>
        <td>${esc(fmt(h.avgGross))}</td>
        <td>${esc(vsPar(h.avgVsPar != null ? Number(h.avgVsPar.toFixed(1)) : null))}</td>
        <td><span class="chip ${strategyClass(h.strategy)}">${esc(h.strategy)}</span></td>
      </tr>`,
    )
    .join("");
  const pills = (nums: number[]) =>
    nums.length
      ? nums
          .map((n) => {
            const h = stats.holes.find((x) => x.number === n);
            return `<a class="card hole-card" href="#hole-${n}"><div class="n">Hole ${n} · par ${h?.par ?? ""}</div><div class="value">${esc(vsPar(h?.avgVsPar != null ? Number(h.avgVsPar.toFixed(1)) : null))}</div><span class="chip">${esc(h?.strategy ?? "")}</span></a>`;
          })
          .join("")
      : `<p class="empty">Need at least two completed scores on a hole.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Batchworth Park — golf report</title>
<style>
  :root { --bg:#0c0e12; --bg-elev:#141820; --line:#2a3142; --text:#e8edf5; --muted:#8b95a8; --accent:#7eb6ff; --good:#5fd2a0; --warn:#e6c36a; --bad:#f07a7a; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.45 "Segoe UI", system-ui, sans-serif; }
  a { color: inherit; }
  .shell { max-width: 1100px; margin: 0 auto; padding: 20px 18px 64px; }
  nav { display: flex; gap: 14px; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 14px; margin-bottom: 22px; }
  nav a { color: var(--muted); text-decoration: none; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  h2 { font-size: 20px; margin: 0 0 8px; }
  h3 { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 28px 0 12px; }
  .sub, .muted, .hint, .n { color: var(--muted); }
  .label { color: var(--muted); font-size: 12px; letter-spacing: .05em; text-transform: uppercase; }
  .grid { display: grid; gap: 12px; }
  .stats-row { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
  .hole-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .card { background: var(--bg-elev); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .card .value { font-size: 28px; font-weight: 650; margin-top: 6px; }
  .hole-card { display: flex; flex-direction: column; gap: 4px; text-decoration: none; min-height: 92px; }
  .chip { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #222836; color: var(--muted); }
  .chip.attack { color: var(--good); background: #163226; }
  .chip.play { color: var(--warn); background: #2e2814; }
  .chip.survive { color: var(--bad); background: #33191b; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--muted); font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
  tr.summary td { font-weight: 650; background: #10141c; }
  .cap { color: var(--warn); font-weight: 650; }
  .charts { display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-top: 12px; }
  .trend { width: 100%; height: auto; }
  .grid-line { stroke: #2a3142; }
  .par-line { stroke: #8b95a8; stroke-dasharray: 4 4; }
  .avg-line { fill: none; stroke: #7eb6ff; stroke-width: 2; }
  .axis { fill: #8b95a8; font-size: 11px; }
  .mix { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
  .mix-row { display: grid; grid-template-columns: 72px 1fr 28px; gap: 8px; align-items: center; }
  .mix-track { height: 10px; background: #0c0e12; border-radius: 999px; overflow: hidden; }
  .mix-bar { display: block; height: 100%; border-radius: 999px; }
  .mix-bar.good { background: var(--good); } .mix-bar.even { background: #c5cedd; }
  .mix-bar.bogey { background: var(--warn); } .mix-bar.bad { background: var(--bad); }
  .mix-n { text-align: right; font-weight: 650; }
  a.hole-link { color: var(--accent); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .block { margin-top: 28px; }
  .table-wrap { overflow-x: auto; }
  @media (max-width: 800px) { .charts { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="shell">
  <nav>
    <strong>Batchworth Park · ${esc(playerName)}</strong>
    <a href="#dashboard">Dashboard</a>
    <a href="#plan">Game plan</a>
    <a href="#holes">Holes</a>
  </nav>
  <p class="sub">${esc(playerName)} · read-only snapshot · all tees · generated ${esc(generated)} UTC. Open this file in a browser. It does not need the app.</p>

  <section id="dashboard">
    <h1>Dashboard</h1>
    <div class="grid stats-row">
      <div class="card"><div class="label">Rounds</div><div class="value">${stats.roundCount}</div></div>
      <div class="card"><div class="label">Avg gross</div><div class="value">${esc(fmt(stats.avgGross))}</div><div class="hint">${stats.completeGrossCount} complete 18s</div></div>
      <div class="card"><div class="label">Best / worst</div><div class="value">${stats.bestGross ?? "—"} <span class="muted">/ ${stats.worstGross ?? "—"}</span></div></div>
      <div class="card"><div class="label">Avg points</div><div class="value">${esc(fmt(stats.avgPoints))}</div><div class="hint">Best ${stats.bestPoints ?? "—"}</div></div>
      <div class="card"><div class="label">Front / back</div><div class="value">${esc(fmt(stats.avgFront9))} <span class="muted">/ ${esc(fmt(stats.avgBack9))}</span></div></div>
    </div>
    <h3>Last round</h3>
    ${
      last
        ? `<div class="card"><div class="label">${esc(last.playedOn)} · ${esc(last.tee)} · ${esc(formatName(last.format))} · HI ${last.handicapIndex.toFixed(1)} · CH ${last.playingHandicap}</div><div class="value">${last.holesCompleted === 18 ? last.gross : last.playedGross} <span class="muted">${esc(vsPar(last.holesCompleted === 18 ? last.vsPar : last.playedVsPar))}${last.holesCompleted === 18 ? "" : ` · ${last.holesCompleted} holes`} · ${last.points} pts</span></div></div>`
        : `<p class="empty">No rounds yet.</p>`
    }
    <h3>Problem holes</h3>
    <p class="sub">From the last 10 times each hole was played. Round totals above use every complete round.</p>
    <div class="grid hole-grid">${pills(stats.problemHoles)}</div>
    <h3>Scoring holes</h3>
    <div class="grid hole-grid">${pills(stats.scoringHoles)}</div>
  </section>

  <section id="plan" class="block">
    <h1>Game plan</h1>
    <p class="sub">Each hole uses the last 10 times it was played. Yardage is the white card.</p>
    <div class="table-wrap"><table><thead><tr><th>Hole</th><th>Par</th><th>SI</th><th>Yds</th><th>Avg</th><th>Vs par</th><th>Plan</th></tr></thead><tbody>${plan}</tbody></table></div>
  </section>

  <section id="holes">
    <h1 class="block">Holes</h1>
    ${stats.holes.map((h) => holeSection(h, rounds)).join("")}
  </section>
</div>
</body>
</html>`;
}

export function downloadReport(stats: Stats, rounds: RoundDetail[], playerName: string) {
  const html = buildReport(stats, rounds, playerName);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  a.download = `batchworth-park-${slug}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
