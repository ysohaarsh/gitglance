# Build Journal

Daily log of what was built, decisions made, and what's next.

## 2026-10-11

- Project created: README, ROADMAP, JOURNAL.
- Next: Phase 1, set up the TypeScript project.

## 2026-10-11 (daily run)

- Done: TypeScript project setup. package.json (ESM, `bin` -> dist/cli.js), strict tsconfig (NodeNext, noUncheckedIndexedAccess), minimal `src/cli.ts` with `--version`, `npm run build` works.
- Decision: only typescript + @types/node as devDependencies; commander comes with the CLI skeleton task. No tests/lint yet (next roadmap items).
- Next: add Vitest.

## 2026-10-12

- Done: added Vitest (`npm test` runs `vitest run`) with `tests/version.test.ts` checking VERSION is semver and matches package.json.
- Decisions: tests live in `tests/` (outside tsc's `src` rootDir so they aren't emitted to dist). Bumped `@types/node` to ^22 because vitest 5 has a peer requirement on it (matches the Node 22 in use; engines stays >=18 for runtime).
- Build and tests pass; lint doesn't exist yet (next task).
- Next: ESLint + Prettier with `npm run lint`.

## 2026-10-13

- Done: added ESLint (flat config, typescript-eslint recommended, eslint-config-prettier) and Prettier (`trailingComma: all`). `npm run lint` runs eslint then `prettier --check`; `npm run format` writes fixes.
- Decisions: new devDependencies are all standard tooling (eslint, @eslint/js, typescript-eslint, prettier, eslint-config-prettier). Ran Prettier over the repo, which only touched markdown whitespace.
- Build, lint and tests pass.
- Next: GitHub Actions CI running lint, build and test.

## 2026-10-14

- Done: CI workflow (`.github/workflows/ci.yml`) already existed from earlier infra commits and ran build and test on Node 22/24; added the missing `npm run lint` step so it covers lint, build and test on push/PR.
- Decisions: no new workflow file, to avoid duplicating the existing one.
- Build, lint and tests pass locally.
- Next: CLI skeleton with commander.

## 2026-10-15

- Done: CLI skeleton with `commander`. `src/program.ts` builds the program (`--help`, `-v/--version`, stub subcommands stats, health, changelog, summary); `src/cli.ts` is now a thin entry point. Added `tests/program.test.ts`.
- Decisions: added `commander` as the only runtime dependency (named in the project brief, tiny, no transitive deps). Program construction is separated from the entry point so tests can run it without spawning a process. Stubs print "not implemented yet" and exit 0.
- Build, lint and tests pass.
- Next: git access layer with typed helpers and a temp fixture repo.

## 2026-10-16

- Done: git access layer in `src/git.ts`: `runGit` (execFile, no shell), `isGitRepo`, `hasCommits`, `currentBranch`, `getCommits` (typed `Commit`, since/until/range/maxCount), `listTags`, `listTrackedFiles`, plus `GitError`. Tests in `tests/git.test.ts` build a temp fixture repo.
- Decisions: log output is delimited with ASCII unit/record separators so subjects and bodies containing newlines parse safely. Empty repositories return `[]` instead of throwing. No new dependencies.
- Next: `stats`: total commits, first/last commit date, contributor count.

## 2026-10-17

- Done: first real `stats` output: total commits, first/last commit date, unique contributors (by lowercased author email). Logic in `src/stats.ts` (pure `computeStats`, `formatStats`, `gatherStats`); wired into the `stats` command with a clear error and exit code 1 outside a git repo. Tests in `tests/stats.test.ts`; the program stub test now uses `health`.
- Decisions: contributors are deduped by email, not name. Empty repos print zeros and `n/a`. No new dependencies.
- Build, lint and tests pass.
- Next: `stats` top contributors with `--limit`.

## 2026-10-18

- Done: `stats` now lists top contributors (`topContributors`, `formatContributors`, `gatherReport` in `src/stats.ts`) with `-l/--limit <n>` (default 5, validated as a non-negative integer). README updated.
- Decisions: kept `RepoStats`/`gatherStats` unchanged and added a separate report function so the JSON output task can compose them later. Authors are grouped by lowercased email; ties break by name. No new dependencies.
- Next: `stats` commits per weekday / per hour as ASCII bar charts.

## 2026-10-19

- Done: `stats --charts` prints ASCII bar charts of commits per weekday (Mon-Sun) and per hour (00-23). Logic in new `src/activity.ts` (`computeActivity`, `formatActivity`); `gatherReport` now also returns the commits. Tests in `tests/activity.test.ts`; README updated.
- Decisions: buckets use the author's local time taken from the commit's ISO date rather than the machine's timezone, so output is deterministic. Charts are opt-in via `--charts` to keep default output short. No new dependencies.
- Build, lint and tests pass.
- Next: `stats`: most-changed files (churn hotspots).

## 2026-10-20

- Done: `stats --hotspots` lists the most-changed files by number of commits touching each (`src/churn.ts`: `parseChurn`, `topChurn`, `formatChurn`, `gatherChurn`), honoring `--limit`. Tests in `tests/churn.test.ts`; README updated.
- Decisions: counts commits per path from `git log --name-only --no-renames` rather than line counts, which is cheap and robust; renames are counted under both old and new paths. Opt-in flag keeps default output short. No new dependencies.
- Next: `--json` output flag for all stats.

## 2026-10-21

- Done: `stats --json` prints one JSON document with `stats`, `contributors`, `hotspots` and `activity` (weekday/hour counts). Pure assembly in new `src/report.ts` (`buildJsonReport`), test in `tests/report.test.ts`; README updated.
- Decisions: JSON always includes every section regardless of `--charts`/`--hotspots`, since scripts want the full picture; `--limit` applies to contributors and hotspots. No new dependencies.
- Build, lint and tests pass.
- Next: `--since` / `--until` date filtering.

## 2026-10-22

- Done: `stats --since <date>` / `--until <date>` filter every section (counts, contributors, hotspots, charts, JSON). `gatherReport` and `gatherChurn` take an optional date range passed to `git log --since/--until`. Test builds a repo with dated commits; README updated.
- Decisions: dates are passed straight to git so relative forms like "2 weeks ago" work, rather than adding a date parser. No new dependencies.
- Build, lint and tests pass.
- Next: `health`: check for README, LICENSE, .gitignore, CI config.

## 2026-10-23

- Done: `health` now checks for a README, LICENSE, .gitignore and CI config (GitHub Actions, GitLab, CircleCI, Azure, Travis, Jenkins) and prints a PASS/FAIL table with a summary. Logic in new `src/health.ts` (`checkBasics`, `formatHealth`), tests in `tests/health.test.ts`.
- Decisions: checks look at the working directory (top level only), matching file names case-insensitively; an empty `.github/workflows` does not count. No new dependencies.
- Next: `health`: detect large files tracked in git (configurable threshold).

## 2026-10-24

- Done: `health` now flags files tracked at HEAD above a size threshold (`--max-file-size <kb>`, default 1024). `parseLargeFiles` and `checkLargeFiles` in `src/health.ts` use `git ls-tree -r -l HEAD`; the detail line lists the three largest. Tests cover parsing and a real temp repo; README updated.
- Decisions: checks sizes at HEAD only (not history); a repo with no commits or a non-repo directory skips the check as passing rather than failing the whole command. No new dependencies.
- Build, lint and tests pass.
- Next: `health`: list stale branches (no commits in N days).

## 2026-10-25

- Done: `health` now flags local branches with no commits in N days (`--stale-days <n>`, default 90). `parseStaleBranches` and `checkStaleBranches` in `src/health.ts` use `git for-each-ref refs/heads`; the detail line lists the three oldest. Tests cover parsing and real temp repos; README updated.
- Decisions: only local branches are checked and the checked-out branch is never reported as stale; a repo with no commits skips the check as passing. `now` is injectable for deterministic tests. No new dependencies.
- Next: `health`: TODO/FIXME count per file.

## 2026-10-26

- Done: `health` now counts TODO/FIXME markers per tracked file (`parseTodoCounts` and `checkTodos` in `src/health.ts`, via `git grep -c -I`); the detail line gives the total and the three busiest files. Tests cover parsing and real temp repos; README updated.
- Decisions: whole-word, case-sensitive match so words like "todoist" don't count; binary files are skipped; the check fails when any marker exists, consistent with the other checks (the upcoming score can weigh it). No new dependencies.
- Next: `health`: overall score 0-100 with explanation.
