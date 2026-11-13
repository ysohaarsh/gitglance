import { describe, expect, it } from "vitest";
import type { Commit } from "../src/git.js";
import { computeStreaks, formatStreaks } from "../src/streaks.js";

const at = (date: string): Commit =>
  ({ hash: date, authorName: "x", authorEmail: "x@x.com", date }) as Commit;

describe("computeStreaks", () => {
  const today = new Date("2026-11-13T12:00:00Z");

  it("finds the longest run and ignores same-day duplicates", () => {
    const s = computeStreaks(
      [
        at("2026-11-01T09:00:00+00:00"),
        at("2026-11-01T18:00:00+00:00"),
        at("2026-11-02T09:00:00+00:00"),
        at("2026-11-03T09:00:00+00:00"),
        at("2026-11-10T09:00:00+00:00"),
      ],
      today,
    );
    expect(s.longest).toBe(3);
    expect(s.current).toBe(0);
  });

  it("counts a current streak ending today or yesterday", () => {
    const commits = [
      at("2026-11-12T09:00:00+00:00"),
      at("2026-11-11T09:00:00+00:00"),
    ];
    expect(computeStreaks(commits, today).current).toBe(2);
    expect(
      computeStreaks([at("2026-11-13T01:00:00+00:00")], today).current,
    ).toBe(1);
  });

  it("handles empty input", () => {
    expect(computeStreaks([], today)).toEqual({ longest: 0, current: 0 });
  });
});

describe("formatStreaks", () => {
  it("pluralizes days", () => {
    expect(formatStreaks({ longest: 1, current: 0 })).toBe(
      "Longest streak: 1 day\nCurrent streak: 0 days",
    );
  });
});
