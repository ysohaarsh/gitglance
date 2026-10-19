import { describe, expect, it } from "vitest";
import type { Commit } from "../src/git.js";
import { computeActivity, formatActivity } from "../src/activity.js";

function at(date: string): Commit {
  return {
    hash: date,
    authorName: "x",
    authorEmail: "x@x.com",
    date,
    subject: "s",
    body: "",
  };
}

describe("computeActivity", () => {
  it("buckets by author-local weekday and hour", () => {
    // 2026-10-19 is a Monday, 2026-10-18 a Sunday.
    const a = computeActivity([
      at("2026-10-19T09:15:00+02:00"),
      at("2026-10-19T09:45:00-05:00"),
      at("2026-10-18T23:00:00+00:00"),
    ]);
    expect(a.weekdays).toEqual([2, 0, 0, 0, 0, 0, 1]);
    expect(a.hours[9]).toBe(2);
    expect(a.hours[23]).toBe(1);
  });

  it("returns zeros for no commits", () => {
    const a = computeActivity([]);
    expect(a.weekdays).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(a.hours).toHaveLength(24);
  });
});

describe("formatActivity", () => {
  it("scales bars to the busiest bucket", () => {
    const out = formatActivity(
      computeActivity([
        at("2026-10-19T09:00:00Z"),
        at("2026-10-19T09:30:00Z"),
        at("2026-10-20T10:00:00Z"),
      ]),
    );
    const lines = out.split("\n");
    expect(lines[0]).toBe("Commits by weekday:");
    expect(lines[1]).toMatch(/^ {2}Mon █{30} +2$/);
    expect(lines[2]).toMatch(/^ {2}Tue █{15} +1$/);
    expect(lines[3]).toMatch(/^ {2}Wed +0$/);
    expect(out).toContain("Commits by hour:");
  });
});
