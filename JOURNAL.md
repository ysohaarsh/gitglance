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
