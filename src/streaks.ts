import { plain, type Painter } from "./color.js";
import type { Commit } from "./git.js";

export interface Streaks {
  /** Longest run of consecutive days with at least one commit. */
  longest: number;
  /** Run of consecutive commit days ending today or yesterday; 0 if broken. */
  current: number;
}

const DAY_MS = 86_400_000;

/** Day number (days since epoch) of the author-local date in an ISO string. */
function dayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!) / DAY_MS);
}

/**
 * Compute daily commit streaks using each commit's author-local date.
 * `today` is injectable for testing; it defaults to the current UTC day.
 */
export function computeStreaks(
  commits: Commit[],
  today: Date = new Date(),
): Streaks {
  const days = [
    ...new Set(
      commits
        .map((c) => dayNumber(c.date))
        .filter((d): d is number => d !== null),
    ),
  ].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const todayNum = Math.floor(today.getTime() / DAY_MS);
  const current =
    prev !== null && todayNum - prev <= 1 && todayNum - prev >= 0 ? run : 0;
  return { longest, current };
}

function plural(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export function formatStreaks(s: Streaks, paint: Painter = plain): string {
  return [
    `${paint.dim("Longest streak:")} ${plural(s.longest)}`,
    `${paint.dim("Current streak:")} ${plural(s.current)}`,
  ].join("\n");
}
