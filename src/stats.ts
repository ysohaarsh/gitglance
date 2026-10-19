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

export interface Contributor {
  name: string;
  email: string;
  commits: number;
}

/** Rank authors (grouped by lowercased email) by commit count, at most `limit`. */
export function topContributors(
  commits: Commit[],
  limit: number,
): Contributor[] {
  const byEmail = new Map<string, Contributor>();
  for (const c of commits) {
    const key = c.authorEmail.toLowerCase();
    const entry = byEmail.get(key);
    if (entry) entry.commits++;
    else byEmail.set(key, { name: c.authorName, email: key, commits: 1 });
  }
  return [...byEmail.values()]
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit));
}

export function formatContributors(list: Contributor[]): string {
  if (list.length === 0) return "";
  const width = String(list[0]?.commits ?? 0).length;
  return [
    "Top contributors:",
    ...list.map((c) => `  ${String(c.commits).padStart(width)}  ${c.name}`),
  ].join("\n");
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

/** Stats plus the top `limit` contributors for the repository at `cwd`. */
export async function gatherReport(
  cwd: string,
  limit: number,
): Promise<{ stats: RepoStats; top: Contributor[]; commits: Commit[] }> {
  if (!(await isGitRepo(cwd))) {
    throw new Error(`${cwd} is not a git repository`);
  }
  const commits = (await hasCommits(cwd)) ? await getCommits(cwd) : [];
  return {
    stats: computeStats(commits),
    top: topContributors(commits, limit),
    commits,
  };
}
