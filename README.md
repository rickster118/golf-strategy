# golf-strategy

Score tracker for **Batchworth Park Golf Club**. It runs on this PC only. Open it in a browser, pick a player, and type a card. The course (pars, stroke index, yardage, course rating, and slope) is shared. Each player’s rounds stay separate.

Players for now: **Ricki**, **Ramji**, and **Jesant**.

## Start locally

You need **Rust** (`rustup`), **Visual Studio Build Tools** with the C++ tools (the MSVC linker), and **Node.js**.

Use two terminals and leave both running.

Terminal 1 — API at http://127.0.0.1:8787:

```
cd server
cargo run
```

On Windows, if cargo says `link.exe` was not found, run that command from a Visual Studio **x64 Native Tools** or **Developer Command Prompt** so the linker is on the path.

Terminal 2 — site at http://localhost:5173 (it proxies `/api` to the API):

```
cd web
npm install
npm run dev
```

`npm install` is only needed the first time, or after dependencies change.

Then open http://localhost:5173.

The database is created at `data/golf.db` and is not committed. The course card is `data/batchworth-park.json`. The API reads that file when it starts, so restart the API after a course change.

Tests:

```
cd server
cargo test
```

## How to use it

The buttons at the top choose whose scores you are looking at. The choice is remembered in this browser. Switching player on an unsaved card clears the boxes, so a round cannot be saved against the wrong person.

**Log round.** Date, tee (White, Yellow, or Blue), format, and handicap index. Course handicap is calculated from the index and that tee’s rating and slope. Type the gross score in each box. Tab or Enter moves to the next hole. The running total is there so you can check it before saving.

If you picked up, type the net double as the gross. A score worse than net double still stores what you typed, and the cap is shown in brackets.

Leave a hole blank for a 9-hole round or any unfinished card. Saving asks you to confirm. Blank holes are not scores: they are left out of that hole’s averages, and the round does not count as a full 18-hole total.

**Dashboard.** Round totals (average gross, points, front and back) use every complete 18-hole round. Problem holes and scoring holes use recent hole form, described below.

**Rounds.** The list, then a scorecard with out, in, and total. You can edit or delete a round. It stays with the player it was logged for.

**Holes and Game plan.** Averages, the strategy label (attack, play to handicap, or survival), the trend, and the score mix use only the **last 10 times that hole was played**. Older rounds remain in the log and drop out of these views once there is an 11th play. The pages say this. Filtering to White, Yellow, or Blue means the last 10 plays on that tee. Yardage on All tees is the white card.

**Download report** on Game plan saves one HTML file for the selected player. Open it in a browser with no server. It is the dashboard, the plan, and each hole’s trend. It does not include score entry.

## Stack

- Rust (`axum` + SQLite) — rounds, course handicap, Stableford, stats
- React + Vite — the pages

Stableford points are computed from the course handicap and the men’s stroke index. They are not typed in.
