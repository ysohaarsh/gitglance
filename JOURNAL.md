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
