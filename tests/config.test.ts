import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findConfigFile, loadConfig, parseConfig } from "../src/config.js";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "gg-config-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("config", () => {
  it("returns {} when the file is missing", () => {
    expect(loadConfig(tmp())).toEqual({});
  });

  it("loads valid options", () => {
    const d = tmp();
    writeFileSync(
      join(d, ".gitglancerc.json"),
      JSON.stringify({ limit: 3, since: "2024-01-01", staleDays: 30 }),
    );
    expect(loadConfig(d)).toEqual({
      limit: 3,
      since: "2024-01-01",
      staleDays: 30,
    });
  });

  it("rejects invalid JSON", () => {
    const d = tmp();
    writeFileSync(join(d, ".gitglancerc.json"), "{nope");
    expect(() => loadConfig(d)).toThrow("not valid JSON");
  });

  it("rejects unknown keys, bad types and non-objects", () => {
    expect(() => parseConfig({ bogus: 1 })).toThrow('unknown option "bogus"');
    expect(() => parseConfig({ limit: "5" })).toThrow("non-negative number");
    expect(() => parseConfig({ since: 5 })).toThrow("must be a string");
    expect(() => parseConfig([])).toThrow("JSON object");
  });

  it("finds the config in a parent directory", () => {
    const d = tmp();
    writeFileSync(join(d, ".gitglancerc.json"), JSON.stringify({ limit: 7 }));
    const sub = join(d, "a", "b");
    mkdirSync(sub, { recursive: true });
    expect(findConfigFile(sub)).toBe(join(d, ".gitglancerc.json"));
    expect(loadConfig(sub)).toEqual({ limit: 7 });
  });

  it("prefers the nearest config over a parent one", () => {
    const d = tmp();
    writeFileSync(join(d, ".gitglancerc.json"), JSON.stringify({ limit: 7 }));
    const sub = join(d, "pkg");
    mkdirSync(sub);
    writeFileSync(join(sub, ".gitglancerc.json"), JSON.stringify({ limit: 2 }));
    expect(loadConfig(sub)).toEqual({ limit: 2 });
  });
});
