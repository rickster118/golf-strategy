# Golf Strategy — product plan

Private app for tracking my own rounds at **Batchworth Park Golf Club** (Hertfordshire), then turning hole-by-hole scores into stats I can use for strategy.

This is **not** a social network or a full WHS product unless we add handicap later.

Course card (par, SI, yardages, CR/SR) lives in [`data/batchworth-park.json`](data/batchworth-park.json).

---

## Locked decisions

| Topic | Decision |
| --- | --- |
| Club | Batchworth Park Golf Club, Hertfordshire — 18 holes, par 72 |
| Tees | **White most of the time** (CR 71.5 / SR 133, 6399 yds). Yellow occasionally (CR 69.6 / SR 129, 6061 yds). Blue/red stored from the card, not in the usual tee picker |
| Entry | Type scores in the app (v1). No CSV/photo yet |
| Per hole | **Strokes required**. Putts, fairway (FIR), GIR **optional but first-class** — easy to fill when I have them |
| Scoring | **Gross and Stableford points**. Some holes are pick-ups in Stableford — those must not fake a gross score |
| Devices | Phone and desktop, same app |
| Look | Clean **dark stats dashboard** |
| Stack | **Rust API** + **lightweight React** frontend |
| Stableford | **Computed** from playing handicap + men’s SI (`max(0, 2 - net + par)`). Pick-up = 0 points |
| Handicap | **Playing handicap per round only** — no index history |
| Where it runs | **Local PC only** (`cargo run` + Vite, or one binary serving `web/dist`) |
| Colours | **Neutral dark** — no club branding |

---

## Goal

After each round I type the card in. The app shows:

- Scoring on **each hole** over time (average, best, worst, recent form).
- Stroke leaks vs par and vs my own typical score.
- Stableford points as well as gross (and which holes I pick up).
- Optional shot-quality: FIR / GIR / putts when logged.
- Strategy cues: attack / play to handicap / survival.
- Front 9 vs back 9, and whether this season is improving.

---

## Who it is for

- **Me only** (v1).
- One home course. Default analysis **filtered to White**, with Yellow rounds included or separable.

---

## Product (v1)

A dark-themed web app, usable on phone after a round and on desktop for analysis.

### 1. Course (seeded, not a setup wizard)

Batchworth Park is built in from the club scorecard.

- Men’s SI (white/yellow/blue column) is the SI we use.
- Ladies SI stored but unused unless needed later.
- Hole notes can be added later (“don’t go long on 4”).

### 2. Enter a round

- Date, tee (**White default**, Yellow optional).
- Format: medal / Stableford / roll-up (or mixed notes).
- Playing handicap (needed to compute or check Stableford).
- 18 holes: **strokes** (or **picked up**).
- Optional: putts, FIR (hit / miss L / miss R / n/a on par 3s), GIR.
- Optional: Stableford points if I want to type the card as-is; otherwise compute from net vs par using SI + handicap.
- Save draft / complete.

**Pick-ups:** if I pick up, mark the hole picked up, enter **points** (often 0), leave gross empty. Hole **gross averages ignore pick-ups** unless I later enter a max (e.g. net double bogey). Points still count.

### 3. Dashboard

- Last round: gross (if complete), points, vs par, vs my average.
- Season: average gross (complete 18s only), average points, best/worst, trend.
- Front 9 vs back 9.
- Problem holes vs scoring holes.
- FIR / GIR / putts summaries when enough optional data exists.

### 4. Hole detail

e.g. Hole 3 (SI 1, par 4, 439 white):

- Card facts + my notes.
- Gross distribution (completed holes only) and points distribution (includes pick-ups).
- Average, recent 5 vs all-time.
- FIR/GIR/putts if logged.
- Strategy label: attack / play to handicap / survival.

### 5. Game plan

Phone-friendly 18-row sheet for the next round: hole, par, SI, yards (selected tee), my avg, plan, one-line note.

---

## Stableford (important)

Because some holes are pick-ups:

- Round format can be Stableford.
- Each hole: `strokes?`, `pickedUp: bool`, `points?`.
- If handicap + SI known, the API can **compute points** from strokes; if picked up, points are entered or default to 0.
- Stats pages must say when a hole average is **gross (completed only)** vs **points (all holes)**.

---

## Look and feel

- Dark background, high-contrast numbers, sparse chrome.
- Dashboard-first: big last-round score, hole heat (red = leak, teal/green = scoring).
- Phone: fat score inputs, sticky hole numbers 1–18, thumb-friendly optional FIR/GIR.
- Desktop: more charts, 18-column table, hole grid.
- No paper-card nostalgia; this is a stats tool.

---

## Stack — Rust + React

**Yes, Rust is a good fit** for *this* app if we keep it thin. It is not the fastest way to ship a toy CRUD form, but it is a strong fit for the **domain** (Stableford from SI + handicap, pick-ups, hole aggregations, later WHS differentials) and for a **single static binary** you can run locally or host later.

Proposed shape:

| Layer | Choice | Why |
| --- | --- | --- |
| API | Rust (`axum`) | Small HTTP JSON API; compile-time types for Round / HoleScore |
| DB | SQLite (`sqlx`) | One file, enough for years of 18-hole rounds; easy backup |
| Stats | Rust functions over rows | No duplication of Stableford rules in the UI |
| UI | React + Vite, TypeScript | Lightweight dark dashboard; charts later (e.g. Recharts) |
| Talk | JSON over HTTP | React does not need WASM |

**Keep it lightweight:** no microservices, no Redis, no WASM golf engine. React is display + forms. Rust owns persistence and stats.

**Trade-offs:** first compile is slower than Node; Windows needs a Rust toolchain (`rustup`). For a personal tracker that is acceptable. Cricket-web’s Java stack is unnecessary here.

**v0 now:** plan + seeded course JSON. App scaffold next.

Repo: private GitHub [`rickster118/golf-strategy`](https://github.com/rickster118/golf-strategy). Local-first; hosting later if we want phone-away-from-PC.

---

## Data model (draft)

**Course / Tee / Hole** — seeded from JSON (Batchworth Park).

**Round**

- date, tee (`white` \| `yellow`), format, playing handicap, notes, weather optional
- derived: gross total (null if any pick-up without strokes), points total, holes completed

**HoleScore**

- hole number, strokes (optional), picked_up, points (optional)
- putts, fir (`hit` \| `left` \| `right` \| `na`), gir (optional)

Derived, not stored as source of truth: vs par, FIR%, GIR%, putts/GIR, differentials if we add WHS later.

---

## Screens

1. **Home** — last round + problem holes + log this week.
2. **Log round** — tee, format, 18 rows, optional FIR/GIR/putts, pick-up toggle.
3. **Rounds** — history, filter White vs Yellow, medal vs Stableford.
4. **Holes** — 18 cards, coloured by leak.
5. **Hole n** — charts + strategy.
6. **Game plan** — next-round sheet.

---

## Build order

1. Seed Batchworth Park (JSON → DB).
2. Rust API: create/list rounds, hole scores including pick-ups.
3. React: dark shell + log-round form (phone + desktop).
4. Dashboard + hole averages (gross vs points).
5. Optional FIR/GIR/putts on the form and summaries.
6. Strategy labels + game plan.
7. Later: WHS, CSV, hosting.

---

## Defaults taken for v1

- 18 holes only
- Pick-up: no gross, 0 points
- FIR on par 3s is N/A
- Hole names/notes blank until added later

---

## Out of scope for v1

- Live shot tracking / watch sync
- Other courses
- Match play / sweep
- Blue/red as primary tees
- Photo OCR of cards

---

## Run locally

See [README.md](README.md). API is Rust (`server/`), UI is React (`web/`). SQLite file is `data/golf.db` (gitignored).
