import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "./git.js";

export interface HealthCheck {
  name: string;
  passed: boolean;
  detail: string;
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

export function formatHealth(checks: HealthCheck[]): string {
  const width = Math.max(...checks.map((c) => c.name.length));
  const rows = checks.map(
    (c) =>
      `${c.passed ? "PASS" : "FAIL"}  ${c.name.padEnd(width)}  ${c.detail}`,
  );
  const passed = checks.filter((c) => c.passed).length;
  return [
    "Health checks",
    ...rows,
    `${passed}/${checks.length} checks passed`,
  ].join("\n");
}
