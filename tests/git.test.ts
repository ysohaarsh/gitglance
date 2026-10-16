import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GitError,
  currentBranch,
  getCommits,
  hasCommits,
  isGitRepo,
  listTags,
  listTrackedFiles,
  parseLog,
  runGit,
} from "../src/git.js";

let repo: string;
let plain: string;

function git(cwd: string, ...args: string[]): void {
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
}

beforeAll(() => {
  const base = mkdtempSync(join(tmpdir(), "gitglance-"));
  plain = join(base, "plain");
  repo = join(base, "repo");
  mkdirSync(plain);
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "commit.gpgsign", "false");
  git(repo, "config", "tag.gpgsign", "false");
  writeFileSync(join(repo, "a.txt"), "a");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "feat: first", "-m", "Body text");
  git(repo, "tag", "v1.0.0");
  writeFileSync(join(repo, "b.txt"), "b");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "fix: second");
  git(repo, "tag", "v1.1.0");
});

afterAll(() => {
  rmSync(join(repo, ".."), { recursive: true, force: true });
});

describe("git layer", () => {
  it("detects repositories", async () => {
    expect(await isGitRepo(repo)).toBe(true);
    expect(await isGitRepo(plain)).toBe(false);
  });

  it("reports commits and branch", async () => {
    expect(await hasCommits(repo)).toBe(true);
    expect(await currentBranch(repo)).toBe("main");
  });

  it("returns commits newest first with parsed fields", async () => {
    const commits = await getCommits(repo);
    expect(commits.map((c) => c.subject)).toEqual([
      "fix: second",
      "feat: first",
    ]);
    expect(commits[1]).toMatchObject({
      authorName: "Ada",
      authorEmail: "ada@example.com",
      body: "Body text",
    });
    expect(commits[0]?.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(Number.isNaN(Date.parse(commits[0]?.date ?? ""))).toBe(false);
  });

  it("supports ranges and max count", async () => {
    expect((await getCommits(repo, { range: "v1.0.0..HEAD" })).length).toBe(1);
    expect((await getCommits(repo, { maxCount: 1 })).length).toBe(1);
  });

  it("lists tags and tracked files", async () => {
    expect(await listTags(repo)).toEqual(["v1.1.0", "v1.0.0"]);
    expect((await listTrackedFiles(repo)).sort()).toEqual(["a.txt", "b.txt"]);
  });

  it("returns no commits for an empty repository", async () => {
    const empty = join(plain, "empty");
    mkdirSync(empty);
    git(empty, "init", "-q");
    expect(await hasCommits(empty)).toBe(false);
    expect(await getCommits(empty)).toEqual([]);
  });

  it("throws GitError on failure", async () => {
    await expect(runGit(plain, ["log"])).rejects.toBeInstanceOf(GitError);
  });

  it("parses empty log output", () => {
    expect(parseLog("")).toEqual([]);
  });
});
