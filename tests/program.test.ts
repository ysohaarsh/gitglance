import { describe, expect, it, vi } from "vitest";
import { buildProgram } from "../src/program.js";
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

  it("runs subcommand stubs", () => {
    expect(run(["stats"]).out).toContain("stats: not implemented yet");
  });

  it("rejects unknown commands", () => {
    expect(run(["bogus"]).code).toBe(1);
  });
});
