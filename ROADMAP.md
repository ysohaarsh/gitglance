# Roadmap

Tasks are done top to bottom, one per day. Edit freely to steer the project.

## Phase 1: Foundation

- [x] Set up TypeScript project: package.json, tsconfig (strict), ESM, `src/` + `bin` entry, build script
- [x] Add Vitest with one passing test and an `npm test` script
- [x] Add ESLint + Prettier with `npm run lint`
- [x] Add GitHub Actions CI running lint, build and test on push/PR
- [x] CLI skeleton with `commander`: `--help`, `--version`, subcommand stubs (stats, health, changelog, summary)
- [x] Git access layer: thin wrapper around `git` via child_process with typed helpers + tests using a temp fixture repo

## Phase 2: stats

- [x] `stats`: total commits, first/last commit date, number of contributors
- [x] `stats`: top contributors by commits (with `--limit`)
- [x] `stats`: commits per weekday / per hour as ASCII bar charts
- [x] `stats`: most-changed files (churn hotspots)
- [x] `--json` output flag for all stats
- [x] `--since` / `--until` date filtering

## Phase 3: health

- [x] `health`: check for README, LICENSE, .gitignore, CI config; print pass/fail table
- [x] `health`: detect large files tracked in git (configurable threshold)
- [x] `health`: list stale branches (no commits in N days)
- [x] `health`: TODO/FIXME count per file
- [x] `health`: overall score 0–100 with explanation

## Phase 4: changelog

- [ ] Parse Conventional Commit messages (type, scope, breaking) with tests
- [ ] `changelog`: group commits by type between two refs
- [ ] `changelog`: split by version tags, output Markdown
- [ ] `changelog --write`: prepend to CHANGELOG.md

## Phase 5: summary + polish

- [ ] `summary`: call Claude API (ANTHROPIC_API_KEY) to summarize last N days of commits; graceful message if no key
- [ ] Colored, well-formatted terminal output (respect NO_COLOR)
- [ ] Config file support (`.gitglancerc.json`)
- [ ] Full README usage docs with example output
- [ ] Prepare npm publish (files, bin, keywords, prepublish build)
