import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 256 * 1024 * 1024;
const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

export class GitError extends Error {
  constructor(
    message: string,
    readonly args: string[],
  ) {
    super(message);
    this.name = "GitError";
  }
}

export interface Commit {
  hash: string;
  authorName: string;
  authorEmail: string;
  /** ISO 8601 author date. */
  date: string;
  subject: string;
  body: string;
}

export interface LogOptions {
  since?: string;
  until?: string;
  /** Revision or range, e.g. "v1.0.0..HEAD". Defaults to HEAD. */
  range?: string;
  maxCount?: number;
}

/** Run a git command in `cwd` and return stdout. */
export async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: MAX_BUFFER,
    });
    return stdout;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    const detail = e.code === "ENOENT" ? "git is not installed" : e.stderr;
    throw new GitError(
      `git ${args.join(" ")} failed: ${(detail ?? e.message).trim()}`,
      args,
    );
  }
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const out = await runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
    return out.trim() === "true";
  } catch {
    return false;
  }
}

/** True when the repository has at least one commit. */
export async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

export async function currentBranch(cwd: string): Promise<string> {
  const out = await runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return out.trim();
}

export function parseLog(raw: string): Commit[] {
  return raw
    .split(RECORD_SEP)
    .map((r) => r.replace(/^\n/, ""))
    .filter((r) => r.length > 0)
    .map((record) => {
      const [hash, authorName, authorEmail, date, subject, body] =
        record.split(FIELD_SEP);
      return {
        hash: hash ?? "",
        authorName: authorName ?? "",
        authorEmail: authorEmail ?? "",
        date: date ?? "",
        subject: subject ?? "",
        body: (body ?? "").trim(),
      };
    });
}

/** Commits newest first. Returns [] for a repository with no commits. */
export async function getCommits(
  cwd: string,
  options: LogOptions = {},
): Promise<Commit[]> {
  if (!(await hasCommits(cwd))) return [];
  const format = ["%H", "%an", "%ae", "%aI", "%s", "%b"].join(FIELD_SEP);
  const args = ["log", `--format=${format}${RECORD_SEP}`];
  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);
  if (options.maxCount !== undefined)
    args.push(`--max-count=${options.maxCount}`);
  args.push(options.range ?? "HEAD");
  return parseLog(await runGit(cwd, args));
}

/** Tags sorted newest version first. */
export async function listTags(cwd: string): Promise<string[]> {
  const out = await runGit(cwd, ["tag", "--sort=-v:refname"]);
  return out.split("\n").filter((l) => l.length > 0);
}

/** Paths of files tracked in HEAD's index. */
export async function listTrackedFiles(cwd: string): Promise<string[]> {
  const out = await runGit(cwd, ["ls-files", "-z"]);
  return out.split("\0").filter((l) => l.length > 0);
}
