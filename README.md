# gitglance

> Understand any git repository at a glance, from your terminal.

`gitglance` is a TypeScript CLI that analyzes a git repository and tells you what's going on:

- **Activity stats**: commits over time, top contributors, busiest files, churn hotspots
- **Health checks**: missing README/LICENSE/CI, stale branches, large files, TODO density
- **Changelog generation**: from Conventional Commits, grouped by type and version tag
- **AI summary** (optional): a plain-English summary of recent work via the Claude API

## Status

🚧 Built in public, one small improvement a day. See [ROADMAP.md](ROADMAP.md) for what's next and [JOURNAL.md](JOURNAL.md) for the daily build log.

## Planned usage

```bash
npx gitglance stats            # activity overview
npx gitglance health           # repo health report
npx gitglance changelog --since v1.0.0
npx gitglance summary --days 7 # AI summary (needs ANTHROPIC_API_KEY)
```

## License

MIT
