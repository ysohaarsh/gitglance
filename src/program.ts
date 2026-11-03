import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import {
  formatChangelog,
  formatChangelogSections,
  gatherChangelog,
  gatherChangelogByTag,
  prependChangelog,
} from "./changelog.js";
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
import { createPainter, shouldColor } from "./color.js";
import { summarize } from "./summary.js";
import { buildJsonReport } from "./report.js";
import { loadConfig } from "./config.js";
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

/** Numeric option: explicit CLI flag wins, then config file, then default. */
function fromConfig(
  cmd: Command,
  name: string,
  cliValue: string,
  configValue: number | undefined,
): number {
  if (
    configValue !== undefined &&
    cmd.getOptionValueSource(name) === "default"
  ) {
    return configValue;
  }
  return Number(cliValue);
}

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
      async (
        opts: {
          limit: string;
          charts?: boolean;
          hotspots?: boolean;
          json?: boolean;
          since?: string;
          until?: string;
        },
        cmd: Command,
      ) => {
        try {
          const config = loadConfig(process.cwd());
          const limit = fromConfig(cmd, "limit", opts.limit, config.limit);
          opts.since ??= config.since;
          opts.until ??= config.until;
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
          const paint = createPainter(shouldColor());
          console.log(
            [
              formatStats(stats, paint),
              formatContributors(top, paint),
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
    .action(
      async (
        opts: { maxFileSize: string; staleDays: string },
        cmd: Command,
      ) => {
        const config = loadConfig(process.cwd());
        const kb = fromConfig(
          cmd,
          "maxFileSize",
          opts.maxFileSize,
          config.maxFileSize,
        );
        if (!Number.isFinite(kb) || kb <= 0) {
          throw new Error("--max-file-size must be a positive number of KB");
        }
        const days = fromConfig(
          cmd,
          "staleDays",
          opts.staleDays,
          config.staleDays,
        );
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
        console.log(formatHealth(checks, createPainter(shouldColor())));
      },
    );

  program.commands
    .find((c) => c.name() === "changelog")
    ?.option("--from <ref>", "start after this ref (exclusive)")
    .option("--to <ref>", "end at this ref (inclusive)", "HEAD")
    .option("--by-tag", "split into one section per version tag")
    .option("--write", "prepend the result to CHANGELOG.md (implies --by-tag)")
    .action(
      async (opts: {
        from?: string;
        to: string;
        byTag?: boolean;
        write?: boolean;
      }) => {
        try {
          if (opts.write) {
            if (opts.from || opts.to !== "HEAD") {
              throw new Error("--write cannot be combined with --from/--to");
            }
            const file = join(process.cwd(), "CHANGELOG.md");
            const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
            const sections = await gatherChangelogByTag(process.cwd());
            writeFileSync(file, prependChangelog(existing, sections));
            console.log("Updated CHANGELOG.md");
            return;
          }
          if (opts.byTag) {
            if (opts.from || opts.to !== "HEAD") {
              throw new Error("--by-tag cannot be combined with --from/--to");
            }
            const sections = await gatherChangelogByTag(process.cwd());
            console.log(formatChangelogSections(sections));
            return;
          }
          const groups = await gatherChangelog(
            process.cwd(),
            opts.from,
            opts.to,
          );
          const heading = opts.to === "HEAD" ? "Unreleased" : opts.to;
          console.log(formatChangelog(groups, heading));
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
      },
    );

  program.commands
    .find((c) => c.name() === "summary")
    ?.option("--days <n>", "summarize commits from the last N days", "7")
    .action(async (opts: { days: string }, cmd: Command) => {
      try {
        const config = loadConfig(process.cwd());
        const days = fromConfig(cmd, "days", opts.days, config.days);
        if (!Number.isInteger(days) || days <= 0) {
          throw new Error("--days must be a positive integer");
        }
        console.log(await summarize(process.cwd(), days));
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
  return program;
}
