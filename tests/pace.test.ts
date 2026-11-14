import { describe, expect, it } from "vitest";
import type { Commit } from "../src/git.js";
import { computePace, formatPace } from "../src/pace.js";

const at = (date: string): Commit =>
  ({ hash: date, authorName: "x", authorEmail: "x@x.com", date }) as Commit;

describe("computePace", () => {
  it("averages over the first-to-last span and finds the busiest day", () => {
    const p = computePace([
      at("2026-11-01T09:00:00+00:00"),
      at("2026-11-03T09:00:00+00:00"),
      at("2026-11-03T18:00:00+00:00"),
      at("2026-11-14T09:00:00+00:00"),
    ]);
    // 4 commits over 14 days = 2 weeks
    expect(p.perWeek).toBe(2);
    expect(p.busiestDay).toEqual({ date: "2026-11-03", commits: 2 });
  });

  it("treats spans under a week as one week", () => {
    const p = computePace([
      at("2026-11-01T09:00:00+00:00"),
      at("2026-11-02T09:00:00+00:00"),
    ]);
    expect(p.perWeek).toBe(2);
  });

  it("handles empty input", () => {
    expect(computePace([])).toEqual({ perWeek: 0, busiestDay: null });
  });
});

describe("formatPace", () => {
  it("formats both lines", () => {
    expect(
      formatPace({
        perWeek: 2.5,
        busiestDay: { date: "2026-11-03", commits: 1 },
      }),
    ).toBe("Commits per week: 2.5\nBusiest day: 2026-11-03 (1 commit)");
    expect(formatPace({ perWeek: 0, busiestDay: null })).toContain("n/a");
  });
});
