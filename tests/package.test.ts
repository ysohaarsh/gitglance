import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as Record<string, unknown> & {
  bin: Record<string, string>;
  files: string[];
  keywords: string[];
  scripts: Record<string, string>;
};

describe("package.json publish metadata", () => {
  it("exposes the gitglance binary from dist", () => {
    expect(pkg.bin.gitglance).toBe("./dist/cli.js");
    expect(pkg.files).toContain("dist");
  });

  it("has keywords and an author", () => {
    expect(pkg.keywords.length).toBeGreaterThan(3);
    expect(pkg.author).toBeTruthy();
  });

  it("builds and tests before publishing", () => {
    expect(pkg.scripts.prepublishOnly).toContain("npm run build");
    expect(pkg.scripts.prepublishOnly).toContain("npm test");
  });

  it("keeps the CLI entry point as a node script", () => {
    const src = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    expect(src.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
