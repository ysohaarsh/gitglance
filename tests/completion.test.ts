import { describe, expect, it } from "vitest";
import { generateCompletion, isShell } from "../src/completion.js";
import { buildProgram } from "../src/program.js";

describe("completion", () => {
  const program = buildProgram();

  it("validates shell names", () => {
    expect(isShell("bash")).toBe(true);
    expect(isShell("powershell")).toBe(false);
  });

  it("bash script lists subcommands and per-command flags", () => {
    const out = generateCompletion(program, "bash");
    expect(out).toContain("complete -F _gitglance gitglance");
    expect(out).toContain("stats");
    expect(out).toContain("--fail-under");
    expect(out).toContain("--dry-run");
  });

  it("zsh script starts with compdef and describes commands", () => {
    const out = generateCompletion(program, "zsh");
    expect(out.startsWith("#compdef gitglance")).toBe(true);
    expect(out).toContain("'changelog:");
    expect(out).toContain("--from-tag");
  });

  it("fish script registers subcommands and long options", () => {
    const out = generateCompletion(program, "fish");
    expect(out).toContain("complete -c gitglance");
    expect(out).toContain("__fish_seen_subcommand_from health");
    expect(out).toContain("-l repo");
  });
});
