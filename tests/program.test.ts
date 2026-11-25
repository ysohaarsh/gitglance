import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram, resolveRepoPath } from "../src/program.js";
import { VERSION } from "../src/version.js";

function run(args: string[]): { out: string; code?: number } {
  let out = "";
  let code: number | undefined;
  const program = buildProgram();
  program.exitOverride((err) => {
    code = err.exitCode;
    throw err;
  });
  program.configureOutput({
    writeOut: (s) => (out += s),
    writeErr: (s) => (out += s),
  });
  const log = vi.spyOn(console, "log").mockImplementation((m: string) => {
    out += `${m}\n`;
  });
  try {
    program.parse(["node", "gitglance", ...args]);
  } catch {
    // exitOverride throws on --help/--version
  } finally {
    log.mockRestore();
  }
  return { out, code };
}

describe("program", () => {
  it("prints the version", () => {
    expect(run(["--version"]).out.trim()).toBe(VERSION);
  });

  it("lists all subcommands in help", () => {
    const { out } = run(["--help"]);
    for (const name of ["stats", "health", "changelog", "summary"]) {
      expect(out).toContain(name);
    }
  });

  it("documents the summary --days option", () => {
    const summary = buildProgram().commands.find((c) => c.name() === "summary");
    expect(summary?.helpInformation()).toContain("--days <n>");
  });

  it("rejects unknown commands", () => {
    expect(run(["bogus"]).code).toBe(1);
  });
});

describe("--repo", () => {
  it("defaults to the current directory", () => {
    expect(resolveRepoPath(undefined)).toBe(process.cwd());
  });

  it("rejects a missing path", () => {
    expect(() => resolveRepoPath("/definitely/not/here")).toThrow(
      "is not a directory",
    );
  });

  it("runs a command against another repository", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gg-repo-"));
    const git = (...a: string[]) => execFileSync("git", a, { cwd: dir });
    git("init", "-q");
    git("config", "user.email", "a@x.dev");
    git("config", "user.name", "Ann");
    writeFileSync(join(dir, "f.txt"), "x");
    git("add", ".");
    git("commit", "-q", "-m", "feat: first");
    const program = buildProgram();
    let out = "";
    const log = vi.spyOn(console, "log").mockImplementation((m: string) => {
      out += `${m}\n`;
    });
    try {
      await program.parseAsync(["node", "gitglance", "--repo", dir, "stats"]);
    } finally {
      log.mockRestore();
    }
    expect(out).toContain("Commits:");
    expect(out).toContain("1");
  });
});

describe("stats --branch", () => {
  function repo(): string {
    const dir = mkdtempSync(join(tmpdir(), "gg-branch-"));
    const git = (...a: string[]): void => {
      execFileSync("git", a, { cwd: dir, stdio: "ignore" });
    };
    git("init", "-q", "-b", "main");
    git("config", "user.name", "T");
    git("config", "user.email", "t@example.com");
    git("config", "commit.gpgsign", "false");
    writeFileSync(join(dir, "a.txt"), "a");
    git("add", ".");
    git("commit", "-q", "-m", "one");
    git("checkout", "-q", "-b", "feature");
    writeFileSync(join(dir, "b.txt"), "b");
    git("add", ".");
    git("commit", "-q", "-m", "two");
    git("checkout", "-q", "main");
    return dir;
  }

  async function stats(dir: string, ...extra: string[]): Promise<string> {
    let out = "";
    const log = vi.spyOn(console, "log").mockImplementation((m: string) => {
      out += `${m}\n`;
    });
    try {
      await buildProgram().parseAsync([
        "node",
        "gitglance",
        "--repo",
        dir,
        "stats",
        "--format",
        "json",
        ...extra,
      ]);
    } finally {
      log.mockRestore();
    }
    return out;
  }

  it("analyzes the given branch instead of HEAD", async () => {
    const dir = repo();
    expect(JSON.parse(await stats(dir)).stats.totalCommits).toBe(1);
    expect(
      JSON.parse(await stats(dir, "--branch", "feature")).stats.totalCommits,
    ).toBe(2);
  });

  it("fails for an unknown branch", async () => {
    const dir = repo();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.exitCode;
    try {
      await stats(dir, "--branch", "nope");
      expect(String(err.mock.calls[0]?.[0])).toContain("unknown branch");
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = prev;
      err.mockRestore();
    }
  });
});
