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

function bars(labels: string[], counts: number[]): string[] {
  const max = Math.max(0, ...counts);
  const width = String(max).length;
  return labels.map((label, i) => {
    const n = counts[i] ?? 0;
    const len = max === 0 ? 0 : Math.round((n / max) * BAR_WIDTH);
    const bar = "█".repeat(n > 0 ? Math.max(1, len) : 0);
    return `  ${label} ${bar.padEnd(BAR_WIDTH)} ${String(n).padStart(width)}`;
  });
}

export function formatActivity(activity: Activity): string {
  const hourLabels = activity.hours.map((_, h) => String(h).padStart(2, "0"));
  return [
    "Commits by weekday:",
    ...bars(WEEKDAYS, activity.weekdays),
    "",
    "Commits by hour:",
    ...bars(hourLabels, activity.hours),
  ].join("\n");
}
