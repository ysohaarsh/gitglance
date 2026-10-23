import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkBasics, formatHealth } from "../src/health.js";

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
