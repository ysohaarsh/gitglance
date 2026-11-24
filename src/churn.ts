import { plain, type Painter } from "./color.js";
import {
  authorArgs,
  hasCommits,
  isGitRepo,
  type LogOptions,
  runGit,
} from "./git.js";

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

/** Convert a glob (`*`, `**`, `?`) to a RegExp; slash-less globs match any basename. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${glob.includes("/") ? "" : "(?:.*/)?"}${re}$`);
}

/** Drop paths matching any of the globs. */
export function excludePaths(
  counts: Map<string, number>,
  globs: string[],
): Map<string, number> {
  if (globs.length === 0) return counts;
  const res = globs.map(globToRegExp);
  return new Map([...counts].filter(([p]) => !res.some((r) => r.test(p))));
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

export function formatChurn(list: FileChurn[], paint: Painter = plain): string {
  if (list.length === 0) return "";
  const width = String(list[0]?.commits ?? 0).length;
  return [
    paint.bold("Most-changed files:"),
    ...list.map((f, i) => {
      const count = String(f.commits).padStart(width);
      // The single hottest file stands out; the rest are green.
      const shown = i === 0 ? paint.yellow(count) : paint.green(count);
      return `  ${shown}  ${f.path}`;
    }),
  ].join("\n");
}

/** The `limit` most frequently changed files in the repository at `cwd`. */
export async function gatherChurn(
  cwd: string,
  limit: number,
  range: Pick<LogOptions, "since" | "until" | "author"> & {
    exclude?: string[];
  } = {},
): Promise<FileChurn[]> {
  if (!(await isGitRepo(cwd))) {
    throw new Error(`${cwd} is not a git repository`);
  }
  if (!(await hasCommits(cwd))) return [];
  const args = [
    "-c",
    "core.quotepath=false",
    "log",
    "--name-only",
    "--no-renames",
    "--format=",
  ];
  if (range.since) args.push(`--since=${range.since}`);
  if (range.until) args.push(`--until=${range.until}`);
  if (range.author) args.push(...authorArgs(range.author));
  args.push("HEAD");
  const raw = await runGit(cwd, args);
  return topChurn(excludePaths(parseChurn(raw), range.exclude ?? []), limit);
}
