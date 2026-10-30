import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatChangelog,
  formatChangelogSections,
  gatherChangelog,
  gatherChangelogByTag,
  groupCommits,
} from "../src/changelog.js";
import type { Commit } from "../src/git.js";

function commit(hash: string, subject: string, body = ""): Commit {
  return {
    hash,
    authorName: "Ada",
    authorEmail: "ada@example.com",
    date: "2026-01-01T00:00:00Z",
    subject,
    body,
  };
}

describe("groupCommits", () => {
  const groups = groupCommits([
    commit("a".repeat(40), "fix(cli): handle empty repo"),
    commit("b".repeat(40), "feat: add stats"),
    commit("c".repeat(40), "Merge branch 'x'"),
    commit("d".repeat(40), "feat(api)!: drop v1"),
    commit("e".repeat(40), "wip: experiment"),
  ]);

  it("orders groups by type with other last", () => {
    expect(groups.map((g) => g.title)).toEqual([
      "Features",
      "Bug Fixes",
      "Other Changes",
    ]);
  });

  it("keeps entry order and flags breaking changes", () => {
    const features = groups[0]?.entries ?? [];
    expect(features.map((e) => e.description)).toEqual([
      "add stats",
      "drop v1",
    ]);
    expect(features[1]).toMatchObject({ scope: "api", breaking: true });
  });

  it("puts non-conventional and unknown types under other", () => {
    expect(groups[2]?.entries.map((e) => e.description)).toEqual([
      "Merge branch 'x'",
      "experiment",
    ]);
  });

  it("detects breaking footers in the body", () => {
    const [g] = groupCommits([
      commit("f".repeat(40), "feat: x", "BREAKING CHANGE: gone"),
    ]);
    expect(g?.entries[0]?.breaking).toBe(true);
  });
});

describe("formatChangelog", () => {
  it("renders markdown", () => {
    const out = formatChangelog(
      groupCommits([
        commit("1234567890", "feat(cli): add flag"),
        commit("abcdefghij", "fix!: crash"),
      ]),
      "Unreleased",
    );
    expect(out).toBe(
      [
        "## Unreleased",
        "",
        "### Features",
        "",
        "- **cli:** add flag (1234567)",
        "",
        "### Bug Fixes",
        "",
        "- **BREAKING** crash (abcdefg)",
      ].join("\n"),
    );
  });

  it("handles no changes", () => {
    expect(formatChangelog([], "v1")).toBe("## v1\n\nNo changes.");
  });
});

describe("gatherChangelog", () => {
  it("limits commits to the range between refs", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "gitglance-cl-"));
    const run = (...args: string[]): void => {
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
    };
    run("init", "-q", "-b", "main");
    const add = (name: string, msg: string): void => {
      writeFileSync(join(cwd, name), name);
      run("add", name);
      run("commit", "-q", "-m", msg);
    };
    add("a", "feat: one");
    run("tag", "v1");
    add("b", "fix: two");
    add("c", "docs: three");

    const since = await gatherChangelog(cwd, "v1");
    expect(since.map((g) => g.type)).toEqual(["fix", "docs"]);

    const all = await gatherChangelog(cwd);
    expect(all.map((g) => g.type)).toEqual(["feat", "fix", "docs"]);

    const upTo = await gatherChangelog(cwd, undefined, "v1");
    expect(upTo.map((g) => g.type)).toEqual(["feat"]);
  });
});

function makeRepo(): {
  cwd: string;
  add: (n: string, m: string) => void;
  run: (...a: string[]) => void;
} {
  const cwd = mkdtempSync(join(tmpdir(), "gitglance-cl-"));
  const run = (...args: string[]): void => {
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
  };
  run("init", "-q", "-b", "main");
  const add = (name: string, msg: string): void => {
    writeFileSync(join(cwd, name), name);
    run("add", name);
    run("commit", "-q", "-m", msg);
  };
  return { cwd, add, run };
}

describe("gatherChangelogByTag", () => {
  it("splits history by version tag, newest first", async () => {
    const { cwd, add, run } = makeRepo();
    add("a", "feat: one");
    run("tag", "v0.9.0");
    add("b", "fix: two");
    run("tag", "v0.10.0");
    run("tag", "not-a-version");
    add("c", "docs: three");

    const sections = await gatherChangelogByTag(cwd);
    expect(sections.map((s) => s.heading)).toEqual([
      "Unreleased",
      "v0.10.0",
      "v0.9.0",
    ]);
    expect(sections.map((s) => s.groups.map((g) => g.type))).toEqual([
      ["docs"],
      ["fix"],
      ["feat"],
    ]);
    expect(formatChangelogSections(sections)).toContain("## v0.10.0");
  });

  it("omits Unreleased when HEAD is tagged", async () => {
    const { cwd, add, run } = makeRepo();
    add("a", "feat: one");
    run("tag", "v1.0.0");
    const sections = await gatherChangelogByTag(cwd);
    expect(sections.map((s) => s.heading)).toEqual(["v1.0.0"]);
  });

  it("falls back to one Unreleased section without tags", async () => {
    const { cwd, add } = makeRepo();
    add("a", "feat: one");
    const sections = await gatherChangelogByTag(cwd);
    expect(sections.map((s) => s.heading)).toEqual(["Unreleased"]);
    expect(sections[0]?.groups).toHaveLength(1);
  });
});
