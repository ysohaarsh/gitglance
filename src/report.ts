import { computeActivity, type Activity } from "./activity.js";
import type { FileChurn } from "./churn.js";
import { computeStreaks, type Streaks } from "./streaks.js";
import type { Commit } from "./git.js";
import type { Contributor, RepoStats } from "./stats.js";

export interface JsonReport {
  stats: RepoStats;
  contributors: Contributor[];
  hotspots: FileChurn[];
  activity: Activity;
  streaks: Streaks;
}

/** Combine all stats sections into one machine-readable report. */
export function buildJsonReport(
  stats: RepoStats,
  contributors: Contributor[],
  hotspots: FileChurn[],
  commits: Commit[],
): JsonReport {
  return {
    stats,
    contributors,
    hotspots,
    activity: computeActivity(commits),
    streaks: computeStreaks(commits),
  };
}
