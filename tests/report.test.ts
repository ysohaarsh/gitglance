import { describe, expect, it } from "vitest";
import { buildJsonReport } from "../src/report.js";
import type { Commit } from "../src/git.js";

const commit = {
  hash: "a",
  authorName: "A",
  authorEmail: "a@x.io",
  date: "2024-01-01T10:00:00+00:00",
  subject: "s",
  body: "",
} as Commit;

describe("buildJsonReport", () => {
  it("combines sections and round-trips through JSON", () => {
    const report = buildJsonReport(
      {
        totalCommits: 1,
        firstCommitDate: commit.date,
        lastCommitDate: commit.date,
        contributors: 1,
      },
      [{ name: "A", email: "a@x.io", commits: 1 }],
      [{ path: "f.ts", commits: 1 }],
      [commit],
    );
    const parsed = JSON.parse(JSON.stringify(report));
    expect(parsed.stats.totalCommits).toBe(1);
    expect(parsed.hotspots).toEqual([{ path: "f.ts", commits: 1 }]);
    expect(parsed.activity.weekdays).toHaveLength(7);
    expect(parsed.activity.hours[10]).toBe(1);
  });
});
