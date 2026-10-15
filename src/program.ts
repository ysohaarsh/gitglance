import { Command } from "commander";
import { VERSION } from "./version.js";

interface Subcommand {
  name: string;
  description: string;
}

const SUBCOMMANDS: Subcommand[] = [
  { name: "stats", description: "Show commit activity statistics" },
  { name: "health", description: "Run repository health checks" },
  { name: "changelog", description: "Generate a changelog from commits" },
  { name: "summary", description: "Summarize recent work with AI (optional)" },
];

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("gitglance")
    .description("Understand any git repository at a glance")
    .version(VERSION, "-v, --version", "print the version");

  for (const { name, description } of SUBCOMMANDS) {
    program
      .command(name)
      .description(description)
      .action(() => {
        console.log(`gitglance ${name}: not implemented yet`);
      });
  }
  return program;
}
