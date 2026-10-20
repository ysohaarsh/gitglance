import { hasCommits, isGitRepo, runGit } from "./git.js";

export interface FileChurn {
  path: string;
  /** Number of commits that touched the file. */
  commits: number;
}

/** Count how many commits touched each path from `git log --name-only` output. */
export function parseChurn(raw: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

/** Rank files by commit count (ties by path), at most `limit`. */
export function topChurn(
  counts: Map<string, number>,
  limit: number,
): FileChurn[] {
  return [...counts.entries()]
    .map(([path, commits]) => ({ path, commits }))
    .sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
    .slice(0, Math.max(0, limit));
}

export function formatChurn(list: FileChurn[]): string {
  if (list.length === 0) return "";
  const width = String(list[0]?.commits ?? 0).length;
  return [
    "Most-changed files:",
    ...list.map((f) => `  ${String(f.commits).padStart(width)}  ${f.path}`),
  ].join("\n");
}

/** The `limit` most frequently changed files in the repository at `cwd`. */
export async function gatherChurn(
  cwd: string,
  limit: number,
): Promise<FileChurn[]> {
  if (!(await isGitRepo(cwd))) {
    throw new Error(`${cwd} is not a git repository`);
  }
  if (!(await hasCommits(cwd))) return [];
  const raw = await runGit(cwd, [
    "-c",
    "core.quotepath=false",
    "log",
    "--name-only",
    "--no-renames",
    "--format=",
    "HEAD",
  ]);
  return topChurn(parseChurn(raw), limit);
}
