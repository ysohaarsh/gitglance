import { plain, type Painter } from "./color.js";
import type { Commit } from "./git.js";

export interface Pace {
  /** Average commits per week over the span from first to last commit day. */
  perWeek: number;
  /** Day (YYYY-MM-DD, author-local) with the most commits; earliest wins ties. */
  busiestDay: { date: string; commits: number } | null;
}

const DAY_MS = 86_400_000;

function dayOf(iso: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1]! : null;
}

/** Commits per week (span is at least one week) and the busiest day ever. */
export function computePace(commits: Commit[]): Pace {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const day = dayOf(c.date);
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  if (counts.size === 0) return { perWeek: 0, busiestDay: null };
  const days = [...counts.keys()].sort();
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const spanDays =
    (Date.parse(days[days.length - 1]!) - Date.parse(days[0]!)) / DAY_MS + 1;
  const weeks = Math.max(1, spanDays / 7);
  let busiest = days[0]!;
  for (const d of days) {
    if (counts.get(d)! > counts.get(busiest)!) busiest = d;
  }
  return {
    perWeek: Math.round((total / weeks) * 10) / 10,
    busiestDay: { date: busiest, commits: counts.get(busiest)! },
  };
}

export function formatPace(p: Pace, paint: Painter = plain): string {
  const busiest = p.busiestDay
    ? `${p.busiestDay.date} (${p.busiestDay.commits} ${p.busiestDay.commits === 1 ? "commit" : "commits"})`
    : "n/a";
  return [
    `${paint.dim("Commits per week:")} ${p.perWeek.toFixed(1)}`,
    `${paint.dim("Busiest day:")} ${busiest}`,
  ].join("\n");
}
