# Golf Strategy — product plan

Private app for tracking my own rounds at **one local club**, then turning hole-by-hole scores into stats I can actually use for strategy (when to attack, when to play for bogey, which holes are costing me strokes).

This is **not** a social network, not a public leaderboard, and not a clone of the full handicap/WHS ecosystem unless we later decide we need it.

---

## Goal

After each weekly round I dump the card in. The app shows:

- How I am scoring on **each hole** over time (average, best, worst, recent form).
- Where I leak strokes vs par (and vs my own typical score).
- Simple strategy cues: “this hole is a disaster hole”, “this one is a scoring chance”, “front 9 vs back 9”.
- Progress: am I getting better this season, or repeating the same mistakes?

---

## Who it is for

- **Me only** (v1).
- Rounds at **one home club / one 18-hole course**.
- Uploads are weekly (typical club round), not live on-course GPS tracking.

---

## Proposed product (v1)

A small web app I can open on laptop or phone after a round.

### 1. Course setup (once)

- Club name, course name, tees I usually play.
- 18 holes with **par**, **stroke index / handicap**, and **yardage** if I have them.
- Optional: hole name, notes (“out of bounds right”, “don’t go long”).

Without this, hole stats cannot be compared to par.

### 2. Enter a round

Fast path after Sunday golf:

- Date, tee time optional, weather optional (wind / rain / still).
- Playing handicap / course handicap if I want net vs gross later.
- 18 boxes for **gross strokes**.
- Optional extras per hole (if we decide they are worth the typing):
  - fairway hit / miss L or R
  - GIR
  - putts
  - penalty / 3-putt / bunker
- Save as draft, then mark complete.

**Upload** in v1 likely means **typed entry or CSV/photo of the card**, not a live integration with a watch. That is an open question below.

### 3. Dashboard (home)

After a few rounds:

- Last round total vs par, vs my average.
- Season average, best round, worst round, trend (getting better / worse).
- Front 9 vs back 9 split.
- “Problem holes” — highest average vs par, or most double-bogeys+.
- “Scoring holes” — where I make birdies or most pars.

### 4. Hole detail (the strategy page)

One page per hole, e.g. Hole 7:

- Par, SI, yardage, my notes.
- Distribution: birdie / par / bogey / double+ counts.
- Average score, recent 5-round average vs all-time.
- Mini chart over time.
- Suggested stance (draft, we can tune later):
  - **Attack** — I often make par or better; birdie is on.
  - **Play to handicap** — average is around bogey; don’t hero it.
  - **Survival** — doubles pile up; aim for bogey and take the medicine.

### 5. Strategy summary

A printable / phone-friendly “game plan” for the next round:

- 18 rows: hole, par, my avg, plan (attack / par / bogey), one-line note.
- Optional: “if you’re X over after 6 holes, switch to conservative on 12 and 14”.

This is the bit cricket-style stats should feed: not vanity charts, **decisions**.

---

## Suggested later (not v1 unless you want them)

- Handicap index estimate from differentials.
- Multiple tees / winter vs summer greens.
- Playing partners / match play vs medal.
- Shot-by-shot or GPS (too heavy for weekly card upload).
- Weather API auto-fill.
- Practice drills linked to weak holes (e.g. “short game, holes 3/11/16”).

---

## Technical direction (proposal only)

Keep this **simple and local-first**, then host if we want.

| Choice | Proposal | Why |
| --- | --- | --- |
| App type | Web app (phone + desktop) | Enter scores at home; glance at hole stats on the range |
| Stack | TBD — see questions. Default lean option: a TypeScript web app with a small database | Cricket-web is Java/Dropwizard; this product is more UI/charts, so a lighter web stack may fit better |
| Data | Rounds + holes + scores as first-class tables | Easy to query “avg on 14” |
| Auth | None at first (you on your machine / private deploy), or a single login if hosted | Private GitHub repo already; the running app does not need to be public |
| Hosting | Local first; optional later (same style of private deploy as cricket-web if you want AWS) | Don’t pay for infra until the model of a round is solid |

**v0 in this repo:** plan + questions only. No app code until you answer the look-and-feel / data questions.

---

## Data we probably need

**Course**

- name, club, tees, slope/rating if we ever do handicap maths

**Hole**

- number 1–18, par, stroke index, yards, notes

**Round**

- date, tees, weather, competition type (medal / stableford / roll-up), notes, total (derived)

**HoleScore**

- round + hole, strokes, optional putts / FIR / GIR / penalties

Derived stats (computed, not stored as source of truth):

- vs par, vs average, birdie/par/bogey rates, streaks, handicap differential if we have rating/slope

---

## Screens (wireframe in words)

1. **Home** — last round headline + 3 problem holes + “log this week’s round”.
2. **Log round** — date + 18 score boxes, big tap targets on phone.
3. **Rounds list** — history, filter by year / medal vs roll-up.
4. **Holes** — 18 cards, colour by “I struggle here”.
5. **Hole n** — chart + distribution + strategy line.
6. **Game plan** — next-round cheat sheet.
7. **Course** — edit pars / SI / notes.

Look and feel is **your call** — questions below.

---

## Build order once questions are answered

1. Course + hole setup (static data for the club).
2. Round entry (gross scores only).
3. Dashboard + hole averages.
4. Charts / distributions.
5. Strategy labels + next-round game plan.
6. Optional extras: CSV upload, putts/GIR, handicap, hosting.

---

## Open questions

Please answer in chat (short bullet replies are fine). I’ll use these to lock the first UI and data model.

### Club and golf

1. **Club / course name?** Official hole names if they have them?
2. **Tees you usually play?** (white / yellow / red / etc.) One tee for v1, or switch often?
3. Can you paste or photo a **scorecard** (par + stroke index + yardage per hole)?
4. Typical round: **medal, Stableford, or social roll-up?** Do you care about **points** as well as **gross strokes**?
5. Do you play **9 holes** sometimes, or always 18?
6. **Handicap**: do you want WHS-style tracking, or just gross vs par for now?

### What you actually write on the card

7. v1 scores: **strokes only**, or also **putts / fairways / GIR / penalties**?
8. How do you want to **upload weekly scores**?
   - Type 18 numbers in the app
   - Spreadsheet / CSV
   - Photo of the card (we type or OCR later)
   - Copy from an existing app (which one?)
9. Anything else per round: **weather, playing partner, “I was hungover”, tee time**?

### Strategy — what “helpful” means

10. What decision are you trying to make? Examples:
    - club off the tee on a hole
    - “play for bogey here”
    - which holes to practise
    - how to pace a medal when you’re having a shocker
11. Should strategy be **rules you set** (“if avg ≥ par+1.5, play safe”) or **suggestions the app invents**?
12. Do you want **front/back 9**, **par 3 vs 4 vs 5**, and **high SI vs low SI** breakdowns in v1?

### Look and feel

13. **Phone-first** after the round, **desktop-first** for analysis, or both equal?
14. Vibe: **clean sports dashboard** (charts, dark, numbers), **simple club diary** (paper-card feel), or **something else** (colours, examples of sites you like)?
15. Colours: club colours, classic golf green/gold, or dark mode stats tool?
16. Any **must-have screens** vs **don’t bother** (e.g. you hate pie charts, you want a printable 18-hole table)?

### Product / tech

17. **Just you**, or might a playing partner log rounds later?
18. Run it **only on your PC**, or also **hosted** so you can open it on the phone at the club?
19. Stack preference: **same Java/Dropwizard world as cricket-web**, or **a lighter TypeScript web app** for UI/charts?
20. Private GitHub is `rickster118/golf-strategy` — anything else (GitHub Pages, AWS like cricket-web) you want from day one?

---

## Out of scope for v1

- Live shot tracking / watch sync
- Public profiles or other clubs’ courses (unless you ask)
- Betting, sweep, or complex match-play scoring
- Teaching anyone else to play golf

---

## Next step

Reply to the open questions (even partial). Then we lock:

- course data
- round fields
- first screens and visual direction

and start building.
