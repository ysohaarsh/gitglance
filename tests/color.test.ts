import { describe, expect, it } from "vitest";
import { createPainter, plain, shouldColor } from "../src/color.js";
import { formatHealth } from "../src/health.js";

describe("shouldColor", () => {
  it("honors NO_COLOR over everything", () => {
    expect(shouldColor({ NO_COLOR: "1", FORCE_COLOR: "1" }, true)).toBe(false);
  });
  it("ignores an empty NO_COLOR", () => {
    expect(shouldColor({ NO_COLOR: "" }, true)).toBe(true);
  });
  it("supports FORCE_COLOR on and off", () => {
    expect(shouldColor({ FORCE_COLOR: "1" }, false)).toBe(true);
    expect(shouldColor({ FORCE_COLOR: "0" }, true)).toBe(false);
  });
  it("requires a TTY and a non-dumb terminal by default", () => {
    expect(shouldColor({}, false)).toBe(false);
    expect(shouldColor({ TERM: "dumb" }, true)).toBe(false);
    expect(shouldColor({ TERM: "xterm" }, true)).toBe(true);
  });
});

describe("createPainter", () => {
  it("returns the no-op painter when disabled", () => {
    expect(createPainter(false)).toBe(plain);
    expect(plain.red("x")).toBe("x");
  });
  it("wraps text in ANSI codes when enabled", () => {
    expect(createPainter(true).red("x")).toBe("\u001b[31mx\u001b[39m");
  });
});

describe("colored formatHealth", () => {
  const checks = [
    { name: "README", passed: true, detail: "README.md" },
    { name: "LICENSE", passed: false, detail: "not found" },
  ];
  it("adds color only with an enabled painter", () => {
    expect(formatHealth(checks)).not.toContain("\u001b");
    const out = formatHealth(checks, createPainter(true));
    expect(out).toContain("\u001b[32mPASS\u001b[39m");
    expect(out).toContain("\u001b[31mFAIL\u001b[39m");
  });
});
