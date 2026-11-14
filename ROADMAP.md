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

- [x] Parse Conventional Commit messages (type, scope, breaking) with tests
- [x] `changelog`: group commits by type between two refs
- [x] `changelog`: split by version tags, output Markdown
- [x] `changelog --write`: prepend to CHANGELOG.md

## Phase 5: summary + polish

- [x] `summary`: call Claude API (ANTHROPIC_API_KEY) to summarize last N days of commits; graceful message if no key
- [x] Colored, well-formatted terminal output (respect NO_COLOR)
- [x] Config file support (`.gitglancerc.json`)
- [x] Full README usage docs with example output
- [x] Prepare npm publish (files, bin, keywords, prepublish build)

## Phase 6: follow-ups

- [x] Exclude source maps and tests from the published tarball; add a `npm pack --dry-run` check to CI
- [x] `stats --format csv` output for contributors and hotspots
- [x] Color the weekday/hour charts and churn hotspots
- [x] `health`: detect missing CONTRIBUTING/SECURITY files as optional checks
- [x] Search parent directories for `.gitglancerc.json`

## Phase 7: next ideas

- [x] `stats --author <name|email>`: restrict all stats to one contributor
- [x] `stats`: commit streaks (longest and current daily streak)
- [x] `stats`: average commits per week and busiest day ever
- [ ] `health`: detect committed secrets-like files (.env, *.pem, id_rsa) as a failing check
- [ ] `health --fail-under <score>`: exit non-zero when the score is below a threshold (CI use)
- [ ] `changelog --from-tag/--to-tag` shortcuts with a friendly error for unknown tags
- [ ] `changelog`: link commit hashes and compare URLs when an `origin` GitHub remote exists
- [ ] `summary --dry-run`: print the prompt that would be sent without calling the API
- [ ] Add `gitglance --repo <path>` global option to analyze a repository elsewhere on disk
- [ ] Shell completion output via `gitglance completion <bash|zsh|fish>`
