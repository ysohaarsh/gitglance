import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Commit } from "../src/git.js";
import { computeStats, formatStats, gatherStats } from "../src/stats.js";

function commit(email: string, date: string): Commit {
  return {
    hash: date,
    authorName: "x",
    authorEmail: email,
    date,
    subject: "s",
    body: "",
  };
}

describe("computeStats", () => {
  it("handles no commits", () => {
    expect(computeStats([])).toEqual({
      totalCommits: 0,
      firstCommitDate: null,
      lastCommitDate: null,
      contributors: 0,
    });
  });

  it("counts commits, dates and unique contributors", () => {
    const stats = computeStats([
      commit("a@x.com", "2026-03-01T10:00:00Z"),
      commit("A@x.com", "2026-02-01T10:00:00Z"),
      commit("b@x.com", "2026-01-01T10:00:00Z"),
    ]);
    expect(stats.totalCommits).toBe(3);
    expect(stats.contributors).toBe(2);
    expect(stats.firstCommitDate).toBe("2026-01-01T10:00:00Z");
    expect(stats.lastCommitDate).toBe("2026-03-01T10:00:00Z");
  });
});

describe("formatStats", () => {
  it("prints dates as days and n/a when empty", () => {
    expect(formatStats(computeStats([]))).toContain("First commit: n/a");
    const out = formatStats(
      computeStats([commit("a@x.com", "2026-03-01T10:00:00Z")]),
    );
    expect(out).toContain("Last commit:  2026-03-01");
  });
});

describe("gatherStats", () => {
  let base: string;
  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), "gitglance-stats-"));
    mkdirSync(join(base, "repo"));
    mkdirSync(join(base, "plain"));
    const cwd = join(base, "repo");
    const run = (...args: string[]) =>
      execFileSync("git", args, {
        cwd,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "Ada",
          GIT_AUTHOR_EMAIL: "ada@example.com",
          GIT_COMMITTER_NAME: "Ada",
          GIT_COMMITTER_EMAIL: "ada@example.com",
        },
      });
    run("init", "-q", "-b", "main");
    run("config", "commit.gpgsign", "false");
    writeFileSync(join(cwd, "a.txt"), "a");
    run("add", ".");
    run("commit", "-q", "-m", "feat: first");
  });
  afterAll(() => rmSync(base, { recursive: true, force: true }));

  it("reads a real repository", async () => {
    const stats = await gatherStats(join(base, "repo"));
    expect(stats.totalCommits).toBe(1);
    expect(stats.contributors).toBe(1);
  });

  it("rejects non-repositories", async () => {
    await expect(gatherStats(join(base, "plain"))).rejects.toThrow(
      "not a git repository",
    );
  });
});
