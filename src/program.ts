import { Command } from "commander";
import { formatChurn, gatherChurn } from "./churn.js";
import { computeActivity, formatActivity } from "./activity.js";
import { formatContributors, formatStats, gatherReport } from "./stats.js";
import { buildJsonReport } from "./report.js";
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
    .option("--charts", "show commits per weekday and per hour")
    .option("--hotspots", "show the most-changed files")
    .option("--json", "print all stats as JSON")
    .action(
      async (opts: {
        limit: string;
        charts?: boolean;
        hotspots?: boolean;
        json?: boolean;
      }) => {
        try {
          const limit = Number(opts.limit);
          if (!Number.isInteger(limit) || limit < 0) {
            throw new Error("--limit must be a non-negative integer");
          }
          const { stats, top, commits } = await gatherReport(
            process.cwd(),
            limit,
          );
          if (opts.json) {
            const hotspots = await gatherChurn(process.cwd(), limit);
            console.log(
              JSON.stringify(
                buildJsonReport(stats, top, hotspots, commits),
                null,
                2,
              ),
            );
            return;
          }
          console.log(
            [
              formatStats(stats),
              formatContributors(top),
              opts.hotspots
                ? formatChurn(await gatherChurn(process.cwd(), limit))
                : "",
              opts.charts ? formatActivity(computeActivity(commits)) : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          );
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
      },
    );
  return program;
}
