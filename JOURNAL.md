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

## 2026-10-27

- Done: `health` now prints a weighted 0-100 score plus a "Points lost" list explaining each failed check. `computeScore` in `src/health.ts`; `formatHealth` appends the score. Tests cover all-pass, all-fail, weighting, default weight and the empty list; README updated.
- Decisions: fixed weights per check (CI 20, TODO/FIXME 20, README 15, large files 15, LICENSE/.gitignore/stale branches 10), unknown checks default to 10; scores are normalised by total weight so new checks slot in. No new dependencies.
- Next: parse Conventional Commit messages (type, scope, breaking) with tests.

## 2026-10-28

- Done: added `parseConventionalCommit` in new `src/conventional.ts` returning type, scope, breaking flag, description and body (or null for non-conventional subjects). Tests in `tests/conventional.test.ts`. Not wired into a command yet; the next changelog tasks consume it.
- Decisions: type is lowercased; breaking is detected from `!` or a `BREAKING CHANGE:`/`BREAKING-CHANGE:` footer; empty scope becomes null. No new dependencies.
- Next: `changelog`: group commits by type between two refs.

## 2026-10-29

- Done: `changelog --from <ref> --to <ref>` now prints a Markdown changelog grouping commits by Conventional Commit type (Features, Bug Fixes, ... , Other Changes). New `src/changelog.ts` (`groupCommits`, `formatChangelog`, `gatherChangelog`), tests in `tests/changelog.test.ts` including a real temp repo; README updated.
- Decisions: `--from` is exclusive, `--to` inclusive and defaults to HEAD (heading "Unreleased" for HEAD, otherwise the ref name); non-conventional or unknown-type commits land under "Other Changes"; breaking changes are marked inline. No new dependencies.
- Next: `changelog`: split by version tags, output Markdown.

## 2026-10-30

- Done: `changelog --by-tag` splits history into one Markdown section per version tag, newest first, with an "Unreleased" section for commits after the latest tag. New `listVersionTags`, `gatherChangelogByTag` and `formatChangelogSections` in `src/changelog.ts`; tests use real temp repos; README updated.
- Decisions: only tags starting with an optional `v` and a digit count as versions, sorted with `git tag --sort=-v:refname` and limited to tags merged into HEAD; each section covers previous tag (exclusive) to its tag (inclusive); `--by-tag` is rejected together with `--from/--to`. No new dependencies.
- Next: `changelog --write`: prepend to CHANGELOG.md.

## 2026-10-31

- Done: `changelog --write` generates the per-tag changelog and prepends it to `CHANGELOG.md` (created with a `# Changelog` title if missing). New `prependChangelog` in `src/changelog.ts`; tests cover creation, prepending, duplicate skipping and Unreleased replacement; README updated.
- Decisions: `--write` implies `--by-tag` and is rejected with `--from/--to`; an existing "Unreleased" section is replaced on each run, and sections whose heading already exists are not repeated, so the command is idempotent. No new dependencies.
- Next: `summary`: call Claude API to summarize last N days of commits, with a graceful message without ANTHROPIC_API_KEY.

## 2026-11-01

- Done: `summary --days <n>` (default 7) sends recent commit subjects to the Claude Messages API and prints the reply. New `src/summary.ts` (`buildPrompt`, `requestSummary`, `summarize`) using the built-in `fetch`; without `ANTHROPIC_API_KEY` it prints a setup hint and exits 0. Tests mock fetch and use a temp repo; README updated.
- Decisions: no SDK dependency (single POST request); `fetch` is injectable for tests; at most 200 commits are sent; default model `claude-haiku-5-5` for low cost. API errors exit 1 with a message.
- Next: colored terminal output (respect NO_COLOR).

## 2026-11-02

- Done: colored terminal output for `stats` and `health`. New `src/color.ts` (`shouldColor`, `createPainter`, no-op `plain` painter); `formatHealth`, `formatStats` and `formatContributors` take an optional painter (PASS green, FAIL red, score green/yellow/red by value, headings bold). Tests in `tests/color.test.ts`; README documents NO_COLOR/FORCE_COLOR.
- Decisions: hand-rolled ANSI codes instead of a dependency; formatters stay pure and default to uncolored so existing tests and piped output are unchanged; NO_COLOR wins over FORCE_COLOR; `--json` and changelog are never colored. Chart and hotspot output not colored yet.
- Next: config file support (`.gitglancerc.json`).

## 2026-11-03

- Done: `.gitglancerc.json` support. New `src/config.ts` (`parseConfig`, `loadConfig`) validates keys `limit`, `since`, `until`, `maxFileSize`, `staleDays`, `days`; `stats`, `health` and `summary` use them as defaults. Tests in `tests/config.test.ts`; README documents the file.
- Decisions: precedence is CLI flag > config > built-in default, detected via commander's option value source; unknown keys and wrong types are hard errors so typos are not silently ignored; config is read from the current directory only (no upward search). No new dependencies.
- Next: full README usage docs with example output.

## 2026-11-04

- Done: replaced the README "Planned usage" block with real docs: install, and per-command sections for `health`, `changelog` and `summary` with example output captured from the actual CLI.
- Decisions: docs-only change, no code or tests touched; examples use real output from this repo. No new dependencies.
- Next: prepare npm publish (files, bin, keywords, prepublish build).

## 2026-11-05

- Done: prepared npm publish. Added `keywords`, `author` and `publishConfig.access` to package.json; `prepublishOnly` now cleans, builds and runs tests. New `tests/package.test.ts` guards the publish metadata and the CLI shebang. Verified with `npm pack --dry-run` (45 files, 25.5 kB, shebang preserved in `dist/cli.js`).
- Decisions: `files` stays `["dist"]` (README, LICENSE and package.json are always included by npm); no new dependencies; version left at 0.1.0 since release-please manages it. Actual `npm publish` is not run.
- Next: roadmap phases 1-5 are complete; added Phase 6 follow-ups, starting with trimming the tarball (source maps) and a pack check in CI.

## 2026-11-06

- Done: trimmed the published tarball. `files` now excludes `dist/**/*.map` (31 files, ~17 kB). New `scripts/check-pack.mjs` (`npm run check:pack`) runs `npm pack --dry-run --json` and fails on source maps, test files or anything outside `dist/` plus package.json/README/LICENSE; wired into CI after tests. Package test updated.
- Decisions: tests were already outside the tarball because `files` is an allowlist and tsc only compiles `src`, so the check guards against regressions; source maps stay generated locally for debugging; no new dependencies.
- Next: `stats --format csv` for contributors and hotspots.

## 2026-11-07

- Done: `stats --format <text|json|csv>`. New `src/csv.ts` (`csvField`, `formatCsv`) emits one RFC 4180 table `section,name,email,commits` covering contributors and hotspots; `--json` stays as shorthand for `--format json`. Invalid formats are a hard error. Tests in `tests/csv.test.ts`; README documents it.
- Decisions: single combined table with a `section` column rather than two CSVs so output stays one pipeable stream; no new dependencies.
- Next: color the weekday/hour charts and churn hotspots.

## 2026-11-08

- Done: colored the `stats --charts` weekday/hour bars and the churn hotspots list. `formatActivity` and `formatChurn` take an optional `Painter` (default `plain`); the busiest bar and hottest file are yellow, other bars/counts green, labels dim, headings bold. `stats` passes its existing painter. Tests cover colored output and that stripping ANSI yields the plain output.
- Decisions: padding is applied before painting so alignment is unaffected; no new Painter methods or dependencies; JSON/CSV output is untouched.
- Next: `health` optional CONTRIBUTING/SECURITY checks.

## 2026-11-09

- Done: `health` now reports optional CONTRIBUTING and SECURITY files (searched in the root, `.github/` and `docs/`). Missing ones show as `WARN` and are excluded from the score and the pass count via a new `optional` flag on `HealthCheck`. Tests cover discovery and score exclusion; README example updated.
- Decisions: kept `checkBasics` unchanged and added a separate `checkOptional` so existing callers/tests are stable; no new dependencies.
- Next: search parent directories for `.gitglancerc.json`.

## 2026-11-10

- Done: `.gitglancerc.json` is now discovered by walking up from the working directory (new `findConfigFile`; `loadConfig` uses it). The nearest file wins; no merging between levels. Tests cover parent lookup and nearest-wins; README note added.
- Decisions: search stops at the filesystem root rather than the git root, keeping behavior simple and predictable; no new dependencies.
- Next: Phase 6 backlog is empty; the next run should add 10 new roadmap tasks.

## 2026-11-11

- Done: Phase 6 backlog was empty, so added Phase 7 to ROADMAP.md with 10 new tasks (stats filters/streaks, health secrets check and `--fail-under`, changelog tag shortcuts/links, `summary --dry-run`, `--repo`, shell completion). No code changes.
- Decisions: tasks ordered by small, self-contained value first.
- Next: `stats --author`.

## 2026-11-12

- Done: `stats --author <text>`. `LogOptions` gained `author`; a shared `authorArgs` helper in `src/git.ts` emits `--fixed-strings --regexp-ignore-case --author=...`, used by both `getCommits` and the churn log so contributors, charts, hotspots, JSON and CSV all respect it. Tests cover name/email matching, case-insensitivity and hotspots; README documents it.
- Decisions: substring match on name or email (not regex) for predictability; no new dependencies; not added to the config file.
- Next: `stats` commit streaks.

## 2026-11-13

- Done: `stats --streaks` shows the longest and current daily commit streaks. New `src/streaks.ts` (`computeStreaks` with injectable `today`, `formatStreaks`); JSON report now always includes `streaks`. Tests cover runs, same-day dedupe, current-streak rules and empty input; README documents it.
- Decisions: days use the author-local date from the ISO timestamp (consistent with `--charts`); the current streak is kept alive if the last commit was yesterday; "today" is the UTC day; no new dependencies.
- Next: `stats` average commits per week and busiest day.

## 2026-11-14

- Done: `stats --pace` shows average commits per week and the busiest day ever. New `src/pace.ts` (`computePace`, `formatPace`); JSON report now always includes `pace`. Tests cover span averaging, the one-week minimum, ties/empty input and formatting; README documents it.
- Decisions: weeks = first-to-last commit day span / 7, minimum one week, rounded to one decimal; days use author-local dates (consistent with streaks/charts); ties go to the earliest day; no new dependencies.
- Next: `health` detection of committed secrets-like files.
