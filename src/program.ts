import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import {
  formatChangelog,
  formatChangelogSections,
  gatherChangelog,
  gatherChangelogByTag,
  prependChangelog,
  resolveTag,
  originRepoUrl,
} from "./changelog.js";
import { formatChurn, gatherChurn } from "./churn.js";
import { formatCsv } from "./csv.js";
import { computeStreaks, formatStreaks } from "./streaks.js";
import { computePace, formatPace } from "./pace.js";
import {
  computeActivity,
  computeMonthly,
  formatActivity,
  formatMonthly,
} from "./activity.js";
import { formatContributors, formatStats, gatherReport } from "./stats.js";
import {
  checkBasics,
  checkOptional,
  checkLargeFiles,
  checkStaleBranches,
  checkSecrets,
  checkTodos,
  computeScore,
  formatHealth,
  parseFailUnder,
} from "./health.js";
import { createPainter, shouldColor } from "./color.js";
import { summarize } from "./summary.js";
import { generateCompletion, isShell, SHELLS } from "./completion.js";
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

/** Resolve the `--repo` option to an existing directory (default: cwd). */
export function resolveRepoPath(repo: string | undefined): string {
  if (repo === undefined) return process.cwd();
  const dir = resolve(repo);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`--repo: "${repo}" is not a directory`);
  }
  return dir;
}

export function buildProgram(): Command {
  const program = new Command();
  let root: string | undefined;
  const getRoot = (): string => root ?? process.cwd();
  program
    .name("gitglance")
    .description("Understand any git repository at a glance")
    .version(VERSION, "-v, --version", "print the version")
    .option("-C, --repo <path>", "analyze the repository at this path")
    .hook("preAction", (thisCommand) => {
      try {
        root = resolveRepoPath(thisCommand.opts<{ repo?: string }>().repo);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

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
    .option("--by-month", "show commits per calendar month")
    .option("--hotspots", "show the most-changed files")
    .option("--streaks", "show longest and current daily commit streaks")
    .option("--pace", "show average commits per week and the busiest day")
    .option("--since <date>", "only count commits after this date")
    .option("--until <date>", "only count commits before this date")
    .option("--author <text>", "only count commits by this name or email")
    .option(
      "--exclude <glob...>",
      "ignore matching paths in churn hotspots (e.g. package-lock.json)",
    )
    .option("--json", "print all stats as JSON")
    .option(
      "--format <format>",
      "output format: text, json or csv (contributors and hotspots)",
      "text",
    )
    .action(
      async (
        opts: {
          limit: string;
          charts?: boolean;
          byMonth?: boolean;
          hotspots?: boolean;
          exclude?: string[];
          streaks?: boolean;
          pace?: boolean;
          json?: boolean;
          format: string;
          since?: string;
          until?: string;
          author?: string;
        },
        cmd: Command,
      ) => {
        try {
          const config = loadConfig(getRoot());
          const limit = fromConfig(cmd, "limit", opts.limit, config.limit);
          opts.since ??= config.since;
          opts.until ??= config.until;
          if (!Number.isInteger(limit) || limit < 0) {
            throw new Error("--limit must be a non-negative integer");
          }
          if (!["text", "json", "csv"].includes(opts.format)) {
            throw new Error("--format must be one of: text, json, csv");
          }
          const format = opts.json ? "json" : opts.format;
          const range = {
            since: opts.since,
            until: opts.until,
            author: opts.author,
          };
          const churnRange = { ...range, exclude: opts.exclude };
          const { stats, top, commits } = await gatherReport(
            getRoot(),
            limit,
            range,
          );
          if (format === "csv") {
            const hotspots = await gatherChurn(getRoot(), limit, churnRange);
            console.log(formatCsv(top, hotspots));
            return;
          }
          if (format === "json") {
            const hotspots = await gatherChurn(getRoot(), limit, churnRange);
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
              opts.streaks ? formatStreaks(computeStreaks(commits), paint) : "",
              opts.pace ? formatPace(computePace(commits), paint) : "",
              opts.hotspots
                ? formatChurn(
                    await gatherChurn(getRoot(), limit, churnRange),
                    paint,
                  )
                : "",
              opts.charts
                ? formatActivity(computeActivity(commits), paint)
                : "",
              opts.byMonth ? formatMonthly(computeMonthly(commits), paint) : "",
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
    .option(
      "--fail-under <score>",
      "exit with code 1 when the health score is below this (0-100)",
    )
    .action(
      async (
        opts: { maxFileSize: string; staleDays: string; failUnder?: string },
        cmd: Command,
      ) => {
        const failUnder =
          opts.failUnder === undefined
            ? undefined
            : parseFailUnder(opts.failUnder);
        const config = loadConfig(getRoot());
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
        const cwd = getRoot();
        const checks = [
          ...checkBasics(cwd),
          await checkLargeFiles(cwd, kb),
          await checkStaleBranches(cwd, days),
          await checkTodos(cwd),
          await checkSecrets(cwd),
          ...checkOptional(cwd),
        ];
        console.log(formatHealth(checks, createPainter(shouldColor())));
        if (failUnder !== undefined) {
          const { score } = computeScore(checks);
          if (score < failUnder) {
            console.error(`Health score ${score} is below ${failUnder}`);
            process.exitCode = 1;
          }
        }
      },
    );

  program.commands
    .find((c) => c.name() === "changelog")
    ?.option("--from <ref>", "start after this ref (exclusive)")
    .option("--to <ref>", "end at this ref (inclusive)", "HEAD")
    .option(
      "--from-tag <tag>",
      "like --from, but the ref must be an existing tag",
    )
    .option("--to-tag <tag>", "like --to, but the ref must be an existing tag")
    .option("--by-tag", "split into one section per version tag")
    .option("--write", "prepend the result to CHANGELOG.md (implies --by-tag)")
    .action(
      async (opts: {
        from?: string;
        to: string;
        fromTag?: string;
        toTag?: string;
        byTag?: boolean;
        write?: boolean;
      }) => {
        try {
          if (opts.fromTag || opts.toTag) {
            if (opts.fromTag && opts.from) {
              throw new Error("--from-tag cannot be combined with --from");
            }
            if (opts.toTag && opts.to !== "HEAD") {
              throw new Error("--to-tag cannot be combined with --to");
            }
            if (opts.fromTag) {
              opts.from = await resolveTag(getRoot(), opts.fromTag);
            }
            if (opts.toTag) {
              opts.to = await resolveTag(getRoot(), opts.toTag);
            }
          }
          if (opts.write) {
            if (opts.from || opts.to !== "HEAD") {
              throw new Error("--write cannot be combined with --from/--to");
            }
            const file = join(getRoot(), "CHANGELOG.md");
            const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
            const sections = await gatherChangelogByTag(getRoot());
            writeFileSync(file, prependChangelog(existing, sections));
            console.log("Updated CHANGELOG.md");
            return;
          }
          if (opts.byTag) {
            if (opts.from || opts.to !== "HEAD") {
              throw new Error("--by-tag cannot be combined with --from/--to");
            }
            const sections = await gatherChangelogByTag(getRoot());
            console.log(formatChangelogSections(sections));
            return;
          }
          const groups = await gatherChangelog(getRoot(), opts.from, opts.to);
          const heading = opts.to === "HEAD" ? "Unreleased" : opts.to;
          const repoUrl = await originRepoUrl(getRoot());
          const links = repoUrl
            ? {
                repoUrl,
                compare: opts.from ? `${opts.from}...${opts.to}` : undefined,
              }
            : undefined;
          console.log(formatChangelog(groups, heading, links));
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
      },
    );

  program.commands
    .find((c) => c.name() === "summary")
    ?.option("--days <n>", "summarize commits from the last N days", "7")
    .option("--dry-run", "print the prompt without calling the API")
    .action(async (opts: { days: string; dryRun?: boolean }, cmd: Command) => {
      try {
        const config = loadConfig(getRoot());
        const days = fromConfig(cmd, "days", opts.days, config.days);
        if (!Number.isInteger(days) || days <= 0) {
          throw new Error("--days must be a positive integer");
        }
        console.log(
          await summarize(
            getRoot(),
            days,
            process.env,
            undefined,
            opts.dryRun === true,
          ),
        );
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  program
    .command("completion")
    .description("Print a shell completion script (bash, zsh or fish)")
    .argument("<shell>", `shell to generate for: ${SHELLS.join(", ")}`)
    .action((shell: string) => {
      if (!isShell(shell)) {
        console.error(
          `Unknown shell "${shell}". Use one of: ${SHELLS.join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write(generateCompletion(program, shell));
    });
  return program;
}
