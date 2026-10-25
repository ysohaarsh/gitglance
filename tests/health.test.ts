import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkBasics,
  checkLargeFiles,
  checkStaleBranches,
  formatHealth,
  parseLargeFiles,
  parseStaleBranches,
} from "../src/health.js";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "gitglance-health-"));
}

describe("checkBasics", () => {
  it("fails everything in an empty directory", () => {
    const checks = checkBasics(tmp());
    expect(checks.map((c) => c.passed)).toEqual([false, false, false, false]);
  });

  it("detects README, LICENSE, .gitignore and GitHub Actions", () => {
    const root = tmp();
    writeFileSync(join(root, "README.md"), "x");
    writeFileSync(join(root, "LICENSE"), "x");
    writeFileSync(join(root, ".gitignore"), "x");
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    writeFileSync(join(root, ".github/workflows/ci.yml"), "x");
    const checks = checkBasics(root);
    expect(checks.every((c) => c.passed)).toBe(true);
    expect(checks[3]?.detail).toBe(".github/workflows");
  });

  it("does not count an empty workflows directory", () => {
    const root = tmp();
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    expect(checkBasics(root)[3]?.passed).toBe(false);
  });
});

describe("formatHealth", () => {
  it("prints a pass/fail table with a summary", () => {
    const out = formatHealth([
      { name: "README", passed: true, detail: "README.md" },
      { name: "LICENSE", passed: false, detail: "not found" },
    ]);
    expect(out).toContain("PASS  README   README.md");
    expect(out).toContain("FAIL  LICENSE  not found");
    expect(out).toContain("1/2 checks passed");
  });
});

describe("parseLargeFiles", () => {
  const out = [
    "100644 blob aaa      10\tsmall.txt",
    "100644 blob bbb 2097152\tdir/big file.bin",
    "100644 blob ccc 1048576\tmid.dat",
    "160000 commit ddd       -\tsub",
  ].join("\n");

  it("returns files at or over the threshold, largest first", () => {
    expect(parseLargeFiles(out, 1048576)).toEqual([
      { path: "dir/big file.bin", bytes: 2097152 },
      { path: "mid.dat", bytes: 1048576 },
    ]);
  });

  it("returns nothing when all files are small", () => {
    expect(parseLargeFiles(out, 10 * 1024 * 1024)).toEqual([]);
  });
});

describe("checkLargeFiles", () => {
  it("flags a tracked file over the threshold", async () => {
    const root = tmp();
    const git = (...a: string[]) => execFileSync("git", a, { cwd: root });
    git("init", "-q");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "T");
    writeFileSync(join(root, "big.bin"), Buffer.alloc(3 * 1024));
    writeFileSync(join(root, "a.txt"), "x");
    git("add", ".");
    git("commit", "-q", "-m", "init");
    const flagged = await checkLargeFiles(root, 2);
    expect(flagged.passed).toBe(false);
    expect(flagged.detail).toContain("big.bin (3.0 KB)");
    expect((await checkLargeFiles(root, 10)).passed).toBe(true);
  });

  it("passes gracefully outside a repository", async () => {
    expect((await checkLargeFiles(tmp(), 1)).passed).toBe(true);
  });
});

describe("parseStaleBranches", () => {
  const now = Date.UTC(2026, 0, 31);
  const ts = (daysAgo: number) => Math.floor(now / 1000) - daysAgo * 86400;

  it("keeps old branches oldest first and skips the current branch", () => {
    const refs = [
      ` \tfresh\t${ts(5)}`,
      ` \told\t${ts(100)}`,
      `*\tmain\t${ts(400)}`,
      ` \tolder\t${ts(200)}`,
    ].join("\n");
    expect(parseStaleBranches(refs, 90, now)).toEqual([
      { name: "older", days: 200 },
      { name: "old", days: 100 },
    ]);
  });
});

describe("checkStaleBranches", () => {
  function git(cwd: string, args: string[], date?: string): void {
    execFileSync("git", args, {
      cwd,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "T",
        GIT_AUTHOR_EMAIL: "t@example.com",
        GIT_COMMITTER_NAME: "T",
        GIT_COMMITTER_EMAIL: "t@example.com",
        ...(date ? { GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date } : {}),
      },
    });
  }

  it("flags an old branch but not the current one", async () => {
    const root = tmp();
    git(root, ["init", "-q", "-b", "main"]);
    git(
      root,
      ["commit", "-q", "--allow-empty", "-m", "a"],
      "2020-01-01T00:00:00Z",
    );
    git(root, ["branch", "old"]);
    const result = await checkStaleBranches(root, 90, Date.UTC(2020, 11, 31));
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("old (");
    expect(result.detail).not.toContain("main");
  });

  it("passes when there are no commits", async () => {
    const root = tmp();
    git(root, ["init", "-q"]);
    expect((await checkStaleBranches(root, 90)).passed).toBe(true);
  });
});
