import { type Commit, getCommits, hasCommits, isGitRepo } from "./git.js";

export interface RepoStats {
  totalCommits: number;
  /** ISO 8601 date of the oldest commit, or null for an empty repository. */
  firstCommitDate: string | null;
  /** ISO 8601 date of the newest commit, or null for an empty repository. */
  lastCommitDate: string | null;
  contributors: number;
}

/** Compute basic stats from commits ordered newest first. */
export function computeStats(commits: Commit[]): RepoStats {
  const newest = commits[0];
  const oldest = commits[commits.length - 1];
  const people = new Set(commits.map((c) => c.authorEmail.toLowerCase()));
  return {
    totalCommits: commits.length,
    firstCommitDate: oldest?.date ?? null,
    lastCommitDate: newest?.date ?? null,
    contributors: people.size,
  };
}

function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "n/a";
}

export function formatStats(stats: RepoStats): string {
  return [
    `Commits:      ${stats.totalCommits}`,
    `First commit: ${day(stats.firstCommitDate)}`,
    `Last commit:  ${day(stats.lastCommitDate)}`,
    `Contributors: ${stats.contributors}`,
  ].join("\n");
}

/** Gather stats for the repository at `cwd`; throws if it is not a git repo. */
export async function gatherStats(cwd: string): Promise<RepoStats> {
  if (!(await isGitRepo(cwd))) {
    throw new Error(`${cwd} is not a git repository`);
  }
  if (!(await hasCommits(cwd))) return computeStats([]);
  return computeStats(await getCommits(cwd));
}
