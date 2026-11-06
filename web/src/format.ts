export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits).replace(/\.0$/, "");
}

export function vsPar(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "E";
  if (n > 0) return `+${n}`;
  return String(n);
}

/** One decimal, with a plus when over. Even is E. */
export function vsSigned(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return vsPar(Number(n.toFixed(1)));
}

export function formatName(f: string): string {
  if (f === "stableford") return "Stableford";
  if (f === "medal") return "Medal";
  if (f === "rollup") return "Roll-up";
  return f;
}

export function strategyClass(s: string): string {
  if (s === "Attack") return "attack";
  if (s === "Survival") return "survive";
  if (s === "Play to handicap") return "play";
  return "";
}

/** Course handicap for 18 holes, nearest whole number. */
export function courseHandicap(index: number, slope: number, courseRating: number, par: number): number {
  return Math.round(index * (slope / 113) + (courseRating - par));
}

/** Strokes received on a hole from playing handicap and men's stroke index. */
export function strokesReceived(playingHandicap: number, strokeIndex: number): number {
  if (playingHandicap <= 0) return 0;
  const base = Math.floor(playingHandicap / 18);
  const extra = playingHandicap % 18;
  return extra > 0 && strokeIndex <= extra ? base + 1 : base;
}

/** Net double bogey: two over par after shots received on the hole. */
export function netDouble(par: number, playingHandicap: number, strokeIndex: number): number {
  return par + 2 + strokesReceived(playingHandicap, strokeIndex);
}

export function yardsFor(
  yards: { white: number; yellow: number; blue: number },
  tee: "white" | "yellow" | "blue",
): number {
  if (tee === "yellow") return yards.yellow;
  if (tee === "blue") return yards.blue;
  return yards.white;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
