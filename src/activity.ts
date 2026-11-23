import { plain, type Painter } from "./color.js";
import type { Commit } from "./git.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_WIDTH = 30;

export interface Activity {
  /** Commit counts Monday to Sunday. */
  weekdays: number[];
  /** Commit counts for hours 0 to 23. */
  hours: number[];
}

/**
 * Bucket commits by weekday and hour, using the author's local time as
 * recorded in the commit's ISO 8601 date.
 */
export function computeActivity(commits: Commit[]): Activity {
  const weekdays = new Array<number>(7).fill(0);
  const hours = new Array<number>(24).fill(0);
  for (const { date } of commits) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2})/.exec(date);
    if (!m) continue;
    const sundayFirst = new Date(
      Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!),
    ).getUTCDay();
    weekdays[(sundayFirst + 6) % 7]!++;
    hours[+m[4]!]!++;
  }
  return { weekdays, hours };
}

function bars(labels: string[], counts: number[], paint: Painter): string[] {
  const max = Math.max(0, ...counts);
  const width = String(max).length;
  return labels.map((label, i) => {
    const n = counts[i] ?? 0;
    const len = max === 0 ? 0 : Math.round((n / max) * BAR_WIDTH);
    const bar = "█".repeat(n > 0 ? Math.max(1, len) : 0);
    // Pad before painting so ANSI codes do not break alignment.
    const pad = " ".repeat(BAR_WIDTH - bar.length);
    const colored = n > 0 && n === max ? paint.yellow(bar) : paint.green(bar);
    const count = String(n).padStart(width);
    return `  ${paint.dim(label)} ${bar ? colored : ""}${pad} ${n === 0 ? paint.dim(count) : count}`;
  });
}

export function formatActivity(
  activity: Activity,
  paint: Painter = plain,
): string {
  const hourLabels = activity.hours.map((_, h) => String(h).padStart(2, "0"));
  return [
    paint.bold("Commits by weekday:"),
    ...bars(WEEKDAYS, activity.weekdays, paint),
    "",
    paint.bold("Commits by hour:"),
    ...bars(hourLabels, activity.hours, paint),
  ].join("\n");
}

/** One calendar month (author-local) and its commit count. */
export interface MonthCount {
  /** Month as `YYYY-MM`. */
  month: string;
  count: number;
}

/**
 * Count commits per calendar month, from the first to the last month that
 * has commits. Months in between without commits are included with 0.
 */
export function computeMonthly(commits: Commit[]): MonthCount[] {
  const counts = new Map<string, number>();
  for (const { date } of commits) {
    const m = /^(\d{4})-(\d{2})/.exec(date);
    if (!m) continue;
    const key = `${m[1]}-${m[2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const keys = [...counts.keys()].sort();
  const [first, last] = [keys[0]!, keys[keys.length - 1]!];
  const result: MonthCount[] = [];
  let year = +first.slice(0, 4);
  let month = +first.slice(5);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push({ month: key, count: counts.get(key) ?? 0 });
    if (key === last) break;
    if (++month > 12) {
      month = 1;
      year++;
    }
  }
  return result;
}

export function formatMonthly(
  months: MonthCount[],
  paint: Painter = plain,
): string {
  return [
    paint.bold("Commits by month:"),
    ...(months.length === 0
      ? ["  (no commits)"]
      : bars(
          months.map((m) => m.month),
          months.map((m) => m.count),
          paint,
        )),
  ].join("\n");
}
