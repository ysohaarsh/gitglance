import { Command } from "commander";
import { formatContributors, formatStats, gatherReport } from "./stats.js";
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

  program.commands
    .find((c) => c.name() === "stats")
    ?.option("-l, --limit <n>", "number of top contributors to show", "5")
    .action(async (opts: { limit: string }) => {
      try {
        const limit = Number(opts.limit);
        if (!Number.isInteger(limit) || limit < 0) {
          throw new Error("--limit must be a non-negative integer");
        }
        const { stats, top } = await gatherReport(process.cwd(), limit);
        console.log(
          [formatStats(stats), formatContributors(top)]
            .filter(Boolean)
            .join("\n\n"),
        );
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
  return program;
}
