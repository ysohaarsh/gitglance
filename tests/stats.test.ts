import { gatherChurn } from "../src/churn.js";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Commit } from "../src/git.js";
import {
  computeStats,
  formatContributors,
  formatStats,
  gatherReport,
  gatherStats,
  topContributors,
} from "../src/stats.js";

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

describe("topContributors", () => {
  const commits = [
    commit("a@x.com", "3"),
    commit("B@x.com", "2"),
    commit("b@x.com", "1"),
    commit("c@x.com", "0"),
  ];

  it("ranks by commits, merging emails case-insensitively", () => {
    const top = topContributors(commits, 10);
    expect(top.map((c) => [c.email, c.commits])).toEqual([
      ["b@x.com", 2],
      ["a@x.com", 1],
      ["c@x.com", 1],
    ]);
  });

  it("respects the limit", () => {
    expect(topContributors(commits, 1)).toHaveLength(1);
    expect(topContributors(commits, 0)).toEqual([]);
  });

  it("formats an aligned list, empty when nobody", () => {
    expect(formatContributors([])).toBe("");
    expect(formatContributors(topContributors(commits, 2))).toBe(
      "Top contributors:\n  2  x\n  1  x",
    );
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

  it("gathers a report with top contributors", async () => {
    const { stats, top } = await gatherReport(join(base, "repo"), 3);
    expect(stats.totalCommits).toBe(1);
    expect(top).toEqual([
      { name: "Ada", email: "ada@example.com", commits: 1 },
    ]);
  });

  it("filters commits by --since/--until", async () => {
    const cwd = join(base, "dated");
    mkdirSync(cwd);
    const run = (date: string, ...args: string[]) =>
      execFileSync("git", args, {
        cwd,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "Ada",
          GIT_AUTHOR_EMAIL: "ada@example.com",
          GIT_COMMITTER_NAME: "Ada",
          GIT_COMMITTER_EMAIL: "ada@example.com",
          GIT_AUTHOR_DATE: date,
          GIT_COMMITTER_DATE: date,
        },
      });
    run("2026-01-01T00:00:00Z", "init", "-q", "-b", "main");
    run("2026-01-01T00:00:00Z", "config", "commit.gpgsign", "false");
    for (const [i, date] of [
      "2026-01-10T12:00:00Z",
      "2026-02-10T12:00:00Z",
      "2026-03-10T12:00:00Z",
    ].entries()) {
      writeFileSync(join(cwd, "f.txt"), String(i));
      run(date, "add", ".");
      run(date, "commit", "-q", "-m", `c${i}`);
    }
    const since = await gatherReport(cwd, 3, { since: "2026-02-01" });
    expect(since.stats.totalCommits).toBe(2);
    const both = await gatherReport(cwd, 3, {
      since: "2026-02-01",
      until: "2026-03-01",
    });
    expect(both.stats.totalCommits).toBe(1);
    const churn = await gatherChurn(cwd, 3, { until: "2026-02-01" });
    expect(churn).toEqual([{ path: "f.txt", commits: 1 }]);
  });

  it("rejects non-repositories", async () => {
    await expect(gatherStats(join(base, "plain"))).rejects.toThrow(
      "not a git repository",
    );
  });
});
