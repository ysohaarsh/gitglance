import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatChurn,
  gatherChurn,
  parseChurn,
  topChurn,
} from "../src/churn.js";

describe("parseChurn", () => {
  it("counts occurrences and ignores blank lines", () => {
    const m = parseChurn("a.ts\nb.ts\n\na.ts\n\n");
    expect(m.get("a.ts")).toBe(2);
    expect(m.get("b.ts")).toBe(1);
  });
});

describe("topChurn", () => {
  it("sorts by commits then path and applies the limit", () => {
    const m = new Map([
      ["b", 2],
      ["a", 2],
      ["c", 5],
    ]);
    expect(topChurn(m, 2)).toEqual([
      { path: "c", commits: 5 },
      { path: "a", commits: 2 },
    ]);
    expect(topChurn(m, 0)).toEqual([]);
  });
});

describe("formatChurn", () => {
  it("aligns counts and returns empty string for no files", () => {
    expect(formatChurn([])).toBe("");
    expect(
      formatChurn([
        { path: "x.ts", commits: 10 },
        { path: "y.ts", commits: 2 },
      ]),
    ).toBe("Most-changed files:\n  10  x.ts\n   2  y.ts");
  });
});

describe("gatherChurn", () => {
  it("ranks files in a real repository", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gitglance-churn-"));
    const git = (...args: string[]): void => {
      execFileSync("git", args, {
        cwd: dir,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "Ada",
          GIT_AUTHOR_EMAIL: "ada@example.com",
          GIT_COMMITTER_NAME: "Ada",
          GIT_COMMITTER_EMAIL: "ada@example.com",
        },
      });
    };
    git("init", "-q", "-b", "main");
    git("config", "commit.gpgsign", "false");
    for (const [i, files] of [["a"], ["a", "b"], ["a"]].entries()) {
      for (const f of files ?? []) writeFileSync(join(dir, f), String(i));
      git("add", ".");
      git("commit", "-q", "-m", `c${i}`);
    }
    expect(await gatherChurn(dir, 5)).toEqual([
      { path: "a", commits: 3 },
      { path: "b", commits: 1 },
    ]);
  });

  it("returns [] for an empty repository and throws outside a repo", async () => {
    const empty = mkdtempSync(join(tmpdir(), "gitglance-empty-"));
    execFileSync("git", ["init", "-q"], { cwd: empty });
    expect(await gatherChurn(empty, 5)).toEqual([]);
    await expect(gatherChurn(tmpdir(), 5)).rejects.toThrow();
  });
});
