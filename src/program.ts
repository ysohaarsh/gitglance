import { Command } from "commander";
import { formatChurn, gatherChurn } from "./churn.js";
import { computeActivity, formatActivity } from "./activity.js";
import { formatContributors, formatStats, gatherReport } from "./stats.js";
import {
  checkBasics,
  checkLargeFiles,
  checkStaleBranches,
  checkTodos,
  formatHealth,
} from "./health.js";
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
    .option("--since <date>", "only count commits after this date")
    .option("--until <date>", "only count commits before this date")
    .option("--json", "print all stats as JSON")
    .action(
      async (opts: {
        limit: string;
        charts?: boolean;
        hotspots?: boolean;
        json?: boolean;
        since?: string;
        until?: string;
      }) => {
        try {
          const limit = Number(opts.limit);
          if (!Number.isInteger(limit) || limit < 0) {
            throw new Error("--limit must be a non-negative integer");
          }
          const range = { since: opts.since, until: opts.until };
          const { stats, top, commits } = await gatherReport(
            process.cwd(),
            limit,
            range,
          );
          if (opts.json) {
            const hotspots = await gatherChurn(process.cwd(), limit, range);
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
                ? formatChurn(await gatherChurn(process.cwd(), limit, range))
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

  program.commands
    .find((c) => c.name() === "health")
    ?.option(
      "--max-file-size <kb>",
      "flag tracked files at least this many KB",
      "1024",
    )
    .option(
      "--stale-days <n>",
      "flag branches with no commits in this many days",
      "90",
    )
    .action(async (opts: { maxFileSize: string; staleDays: string }) => {
      const kb = Number(opts.maxFileSize);
      if (!Number.isFinite(kb) || kb <= 0) {
        throw new Error("--max-file-size must be a positive number of KB");
      }
      const days = Number(opts.staleDays);
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error("--stale-days must be a positive number of days");
      }
      const cwd = process.cwd();
      const checks = [
        ...checkBasics(cwd),
        await checkLargeFiles(cwd, kb),
        await checkStaleBranches(cwd, days),
        await checkTodos(cwd),
      ];
      console.log(formatHealth(checks));
    });
  return program;
}
