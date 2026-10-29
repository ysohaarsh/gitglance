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

## Planned usage

```bash
npx gitglance stats            # commits, first/last date, contributors
npx gitglance health           # repo health report (README, LICENSE, .gitignore, CI, large files, stale branches, TODO/FIXME) with a 0-100 score
npx gitglance health --max-file-size 500   # flag tracked files >= 500 KB (default 1024)
npx gitglance health --stale-days 30       # flag local branches idle for >= 30 days (default 90)
npx gitglance changelog --from v1.0.0 --to HEAD   # Markdown changelog grouped by commit type
npx gitglance summary --days 7 # AI summary (needs ANTHROPIC_API_KEY)
```

## License

MIT
