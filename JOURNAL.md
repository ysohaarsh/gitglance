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
