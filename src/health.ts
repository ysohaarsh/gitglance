import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { plain, type Painter } from "./color.js";
import { runGit } from "./git.js";

export interface HealthCheck {
  name: string;
  passed: boolean;
  detail: string;
  /** Optional checks are shown but never count toward the score or pass total. */
  optional?: boolean;
}

function hasFile(root: string, pattern: RegExp): string | undefined {
  return readdirSync(root).find((f) => pattern.test(f));
}

function hasCiConfig(root: string): string | undefined {
  const checks: [string, (p: string) => boolean][] = [
    [".github/workflows", (p) => existsSync(p) && readdirSync(p).length > 0],
    [".gitlab-ci.yml", existsSync],
    [".circleci/config.yml", existsSync],
    ["azure-pipelines.yml", existsSync],
    [".travis.yml", existsSync],
    ["Jenkinsfile", existsSync],
  ];
  return checks.find(([path, test]) => test(join(root, path)))?.[0];
}

/** Check for the presence of README, LICENSE, .gitignore and CI config. */
export function checkBasics(root: string): HealthCheck[] {
  const found: [string, string | undefined][] = [
    ["README", hasFile(root, /^readme(\.[a-z]+)?$/i)],
    ["LICENSE", hasFile(root, /^(license|licence|copying)(\.[a-z]+)?$/i)],
    [".gitignore", hasFile(root, /^\.gitignore$/)],
    ["CI config", hasCiConfig(root)],
  ];
  return found.map(([name, file]) => ({
    name,
    passed: file !== undefined,
    detail: file ?? "not found",
  }));
}

/** Optional community files: CONTRIBUTING and SECURITY (root, .github or docs). */
export function checkOptional(root: string): HealthCheck[] {
  const find = (pattern: RegExp): string | undefined => {
    for (const dir of ["", ".github", "docs"]) {
      const base = join(root, dir);
      if (!existsSync(base)) continue;
      const hit = readdirSync(base).find((f) => pattern.test(f));
      if (hit) return dir ? `${dir}/${hit}` : hit;
    }
    return undefined;
  };
  const found: [string, string | undefined][] = [
    ["CONTRIBUTING", find(/^contributing(\.[a-z]+)?$/i)],
    ["SECURITY", find(/^security(\.[a-z]+)?$/i)],
  ];
  return found.map(([name, file]) => ({
    name,
    passed: file !== undefined,
    detail: file ?? "not found (optional)",
    optional: true,
  }));
}

export interface LargeFile {
  path: string;
  bytes: number;
}

/** Parse `git ls-tree -r -l` output into files at or above `thresholdBytes`, largest first. */
export function parseLargeFiles(
  lsTree: string,
  thresholdBytes: number,
): LargeFile[] {
  const files: LargeFile[] = [];
  for (const line of lsTree.split("\n")) {
    const m = /^\d+ blob \S+\s+(\d+)\t(.+)$/.exec(line);
    if (!m) continue;
    const bytes = Number(m[1]);
    if (bytes >= thresholdBytes) files.push({ path: m[2] as string, bytes });
  }
  return files.sort(
    (a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path),
  );
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Check for files tracked at HEAD that are at least `thresholdKb` kilobytes. */
export async function checkLargeFiles(
  cwd: string,
  thresholdKb: number,
): Promise<HealthCheck> {
  const name = "Large files";
  let out: string;
  try {
    out = await runGit(cwd, ["ls-tree", "-r", "-l", "HEAD"]);
  } catch {
    return { name, passed: true, detail: "skipped (no commits to inspect)" };
  }
  const large = parseLargeFiles(out, thresholdKb * 1024);
  if (large.length === 0) {
    return { name, passed: true, detail: `none over ${thresholdKb} KB` };
  }
  const shown = large
    .slice(0, 3)
    .map((f) => `${f.path} (${formatSize(f.bytes)})`)
    .join(", ");
  const more = large.length > 3 ? `, +${large.length - 3} more` : "";
  return {
    name,
    passed: false,
    detail: `${large.length} over ${thresholdKb} KB: ${shown}${more}`,
  };
}

export interface StaleBranch {
  name: string;
  days: number;
}

/**
 * Parse `for-each-ref` lines of `<HEAD marker>\t<name>\t<unix time>` into local
 * branches older than `staleDays`, oldest first. The checked-out branch is skipped.
 */
export function parseStaleBranches(
  refs: string,
  staleDays: number,
  nowMs: number,
): StaleBranch[] {
  const stale: StaleBranch[] = [];
  for (const line of refs.split("\n")) {
    const [head, name, ts] = line.split("\t");
    if (!name || !ts || head === "*") continue;
    const days = Math.floor((nowMs / 1000 - Number(ts)) / 86400);
    if (days >= staleDays) stale.push({ name, days });
  }
  return stale.sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
}

/** Unmerged branches are "very old" once idle for this many times the stale threshold. */
export const OLD_UNMERGED_FACTOR = 2;

async function listBranchRefs(cwd: string): Promise<string | undefined> {
  try {
    return await runGit(cwd, [
      "for-each-ref",
      "--format=%(HEAD)\t%(refname:short)\t%(committerdate:unix)",
      "refs/heads",
    ]);
  } catch {
    return undefined;
  }
}

/** Names of local branches whose tip is not reachable from HEAD. */
async function unmergedBranchNames(cwd: string): Promise<Set<string>> {
  try {
    const out = await runGit(cwd, [
      "branch",
      "--no-merged",
      "HEAD",
      "--format=%(refname:short)",
    ]);
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

function summarizeBranches(branches: StaleBranch[]): string {
  const shown = branches
    .slice(0, 3)
    .map((b) => `${b.name} (${b.days}d)`)
    .join(", ");
  const more = branches.length > 3 ? `, +${branches.length - 3} more` : "";
  return shown + more;
}

/**
 * Check for very old branches holding commits that never reached HEAD: idle for
 * at least `OLD_UNMERGED_FACTOR` x `staleDays` days. These may contain lost work,
 * so they are reported apart from merely stale branches.
 */
export async function checkOldUnmergedBranches(
  cwd: string,
  staleDays: number,
  nowMs: number = Date.now(),
): Promise<HealthCheck> {
  const name = "Old unmerged branches";
  const out = await listBranchRefs(cwd);
  if (out === undefined) {
    return { name, passed: true, detail: "skipped (no branches to inspect)" };
  }
  const threshold = staleDays * OLD_UNMERGED_FACTOR;
  const unmerged = await unmergedBranchNames(cwd);
  const old = parseStaleBranches(out, threshold, nowMs).filter((b) =>
    unmerged.has(b.name),
  );
  if (old.length === 0) {
    return { name, passed: true, detail: `none older than ${threshold} days` };
  }
  return {
    name,
    passed: false,
    detail: `${old.length} unmerged and older than ${threshold} days: ${summarizeBranches(old)}`,
  };
}

/**
 * Check for local branches whose last commit is at least `staleDays` days old.
 * Very old unmerged branches are left to `checkOldUnmergedBranches`.
 */
export async function checkStaleBranches(
  cwd: string,
  staleDays: number,
  nowMs: number = Date.now(),
): Promise<HealthCheck> {
  const name = "Stale branches";
  const out = await listBranchRefs(cwd);
  if (out === undefined) {
    return { name, passed: true, detail: "skipped (no branches to inspect)" };
  }
  const unmerged = await unmergedBranchNames(cwd);
  const veryOld = staleDays * OLD_UNMERGED_FACTOR;
  const stale = parseStaleBranches(out, staleDays, nowMs).filter(
    (b) => !(unmerged.has(b.name) && b.days >= veryOld),
  );
  if (stale.length === 0) {
    return { name, passed: true, detail: `none older than ${staleDays} days` };
  }
  return {
    name,
    passed: false,
    detail: `${stale.length} older than ${staleDays} days: ${summarizeBranches(stale)}`,
  };
}

export interface TodoCount {
  path: string;
  count: number;
}

/** Parse `git grep -c` lines of `<path>:<count>` into files with markers, most first. */
export function parseTodoCounts(grepCounts: string): TodoCount[] {
  const files: TodoCount[] = [];
  for (const line of grepCounts.split("\n")) {
    const m = /^(.+):(\d+)$/.exec(line);
    if (m) files.push({ path: m[1] as string, count: Number(m[2]) });
  }
  return files.sort(
    (a, b) => b.count - a.count || a.path.localeCompare(b.path),
  );
}

/** Count TODO/FIXME markers in tracked text files of the working tree, per file. */
export async function checkTodos(cwd: string): Promise<HealthCheck> {
  const name = "TODO/FIXME";
  let out = "";
  try {
    out = await runGit(cwd, ["grep", "-c", "-I", "-E", "\\b(TODO|FIXME)\\b"]);
  } catch {
    // `git grep` exits 1 when nothing matches; treat that (and non-repos) as none.
  }
  const files = parseTodoCounts(out);
  if (files.length === 0) return { name, passed: true, detail: "none found" };
  const total = files.reduce((sum, f) => sum + f.count, 0);
  const shown = files
    .slice(0, 3)
    .map((f) => `${f.path} (${f.count})`)
    .join(", ");
  const more = files.length > 3 ? `, +${files.length - 3} more` : "";
  return {
    name,
    passed: false,
    detail: `${total} in ${files.length} files: ${shown}${more}`,
  };
}

const SECRET_EXAMPLE = /\.(example|sample|template|dist)$/i;
const SECRET_NAME =
  /^(\.env(\..+)?|id_(rsa|dsa|ecdsa|ed25519)|.+\.(pem|key|p12|pfx|jks|keystore))$/i;

/** Pick out paths whose file name looks like a committed secret (env files, private keys). */
export function findSecretFiles(paths: string[]): string[] {
  return paths
    .filter((path) => {
      const base = path.slice(path.lastIndexOf("/") + 1);
      return SECRET_NAME.test(base) && !SECRET_EXAMPLE.test(base);
    })
    .sort();
}

/** Fail when tracked files look like secrets: .env, *.pem, *.key, id_rsa and friends. */
export async function checkSecrets(cwd: string): Promise<HealthCheck> {
  const name = "Secrets";
  let out: string;
  try {
    out = await runGit(cwd, ["ls-files"]);
  } catch {
    return { name, passed: true, detail: "skipped (no files to inspect)" };
  }
  const hits = findSecretFiles(out.split("\n").filter(Boolean));
  if (hits.length === 0) {
    return { name, passed: true, detail: "no secrets-like files tracked" };
  }
  const more = hits.length > 3 ? `, +${hits.length - 3} more` : "";
  return {
    name,
    passed: false,
    detail: `${hits.length} tracked: ${hits.slice(0, 3).join(", ")}${more}`,
  };
}

const CHECK_WEIGHTS: Record<string, number> = {
  README: 15,
  LICENSE: 10,
  ".gitignore": 10,
  "CI config": 20,
  "Large files": 15,
  "Stale branches": 10,
  "Old unmerged branches": 5,
  "TODO/FIXME": 20,
  Secrets: 20,
};
const DEFAULT_WEIGHT = 10;

export interface HealthScore {
  score: number;
  /** One line per failed check: the points it cost and why. */
  deductions: string[];
}

/** Weighted 0-100 score: each check is worth a fixed number of points, lost when it fails. */
export function computeScore(checks: HealthCheck[]): HealthScore {
  const weight = (c: HealthCheck) => CHECK_WEIGHTS[c.name] ?? DEFAULT_WEIGHT;
  checks = checks.filter((c) => !c.optional);
  const total = checks.reduce((sum, c) => sum + weight(c), 0);
  if (total === 0) return { score: 100, deductions: [] };
  const earned = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + weight(c), 0);
  const failed = checks.filter((c) => !c.passed);
  const deductions = failed.map((c) => {
    const lost = Math.round((weight(c) / total) * 100);
    return `-${lost}  ${c.name}: ${c.detail}`;
  });
  return { score: Math.round((earned / total) * 100), deductions };
}

/** Parse a `--fail-under` value: a number from 0 to 100. */
export function parseFailUnder(value: string): number {
  const n = Number(value);
  if (value.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error("--fail-under must be a number between 0 and 100");
  }
  return n;
}

export function formatHealth(
  checks: HealthCheck[],
  paint: Painter = plain,
): string {
  const width = Math.max(...checks.map((c) => c.name.length));
  const rows = checks.map(
    (c) =>
      `${c.passed ? paint.green("PASS") : c.optional ? paint.yellow("WARN") : paint.red("FAIL")}  ${c.name.padEnd(width)}  ${c.detail}`,
  );
  const scored = checks.filter((c) => !c.optional);
  const passed = scored.filter((c) => c.passed).length;
  const { score, deductions } = computeScore(checks);
  const scoreText = `Score: ${score}/100`;
  const colored =
    score >= 80
      ? paint.green(scoreText)
      : score >= 50
        ? paint.yellow(scoreText)
        : paint.red(scoreText);
  return [
    paint.bold("Health checks"),
    ...rows,
    `${passed}/${scored.length} checks passed`,
    colored,
    ...(deductions.length > 0
      ? [paint.bold("Points lost:"), ...deductions.map((d) => paint.red(d))]
      : []),
  ].join("\n");
}
