import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
