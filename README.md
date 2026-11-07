# gitglance

> Understand any git repository at a glance, from your terminal.

`gitglance` is a TypeScript CLI that analyzes a git repository and tells you what's going on:

- **Activity stats**: commits over time, top contributors, busiest files, churn hotspots
- **Health checks**: missing README/LICENSE/CI, stale branches, large files, TODO density
- **Changelog generation**: from Conventional Commits, grouped by type and version tag
- **AI summary** (optional): a plain-English summary of recent work via the Claude API

## Status

🚧 Built in public, one small improvement a day. See [ROADMAP.md](ROADMAP.md) for what's next and [JOURNAL.md](JOURNAL.md) for the daily build log.

## Usage

`gitglance stats` prints a short overview of the current repository:

```
Commits:      12
First commit: 2026-10-11
Last commit:  2026-10-16
Contributors: 2

Top contributors:
  8  Ada Lovelace
  4  Alan Turing
```

Use `--limit <n>` (default 5) to change how many top contributors are listed.

Use `--since <date>` and/or `--until <date>` to restrict every section to a time window. Any date `git log` understands works, e.g. `--since 2026-01-01` or `--since "2 weeks ago"`:

```bash
npx gitglance stats --since 2026-01-01 --until 2026-02-01
```

Add `--charts` to print ASCII bar charts of commits per weekday and per hour (author-local time):

```
Commits by weekday:
  Mon ██████████████████████████████ 8
  Tue ███████████████                4
  ...
```

Add `--hotspots` to list the most-changed files (commits touching each file, honoring `--limit`):

```
Most-changed files:
  14  src/stats.ts
   9  README.md
```

Add `--json` to print everything (stats, contributors, hotspots, weekday/hour activity) as a single JSON document for scripting:

```bash
npx gitglance stats --json | jq .stats.totalCommits
```

Use `--format csv` to export contributors and hotspots as a single table (`section,name,email,commits`) for spreadsheets. `--limit` and `--since`/`--until` apply; `--json` is shorthand for `--format json`.

```bash
npx gitglance stats --format csv > stats.csv
```

### Color

`stats` and `health` output is colored when stdout is a terminal. Set `NO_COLOR` to disable it, or `FORCE_COLOR=1` to force it (for example when piping into `less -R`). `--json` and `changelog` output are never colored.

### Config file

Put a `.gitglancerc.json` in the repository root to set defaults. Command-line flags always win.

```json
{
  "limit": 10,
  "since": "2024-01-01",
  "staleDays": 60,
  "maxFileSize": 512,
  "days": 14
}
```

Supported keys: `limit`, `since`, `until` (stats), `maxFileSize`, `staleDays` (health) and `days` (summary). Unknown keys or wrong types produce an error.

## Install

```bash
npx gitglance --help     # run without installing
npm install -g gitglance # or install globally (Node 22+)
```

Run every command from inside the git repository you want to analyze.

### `health`

```
Health checks
PASS  README          README.md
PASS  LICENSE         LICENSE
PASS  .gitignore      .gitignore
PASS  CI config       .github/workflows
PASS  Large files     none over 1024 KB
PASS  Stale branches  none older than 90 days
FAIL  TODO/FIXME      12 in 5 files: src/health.ts (4), JOURNAL.md (3), README.md (2), +2 more
6/7 checks passed
Score: 80/100
Points lost:
-20  TODO/FIXME: 12 in 5 files: src/health.ts (4), JOURNAL.md (3), README.md (2), +2 more
```

```bash
npx gitglance health --max-file-size 500   # flag tracked files >= 500 KB (default 1024)
npx gitglance health --stale-days 30       # flag local branches idle for >= 30 days (default 90)
```

### `changelog`

```
## Unreleased

### Features

- support .gitglancerc.json defaults for stats, health and summary (764181d)
```

```bash
npx gitglance changelog --from v1.0.0 --to HEAD   # Markdown changelog grouped by commit type
npx gitglance changelog --by-tag   # one section per version tag (plus Unreleased)
npx gitglance changelog --write    # prepend new sections to CHANGELOG.md (Unreleased is refreshed)
```

### `summary`

```bash
export ANTHROPIC_API_KEY=...
npx gitglance summary --days 7   # AI summary of the last 7 days of commits
```

Without `ANTHROPIC_API_KEY` the command prints a setup hint and exits 0; nothing is sent anywhere.

## License

MIT
