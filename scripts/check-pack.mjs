// Verifies the npm tarball contents: only dist output, no source maps or tests.
import process from "node:process";
import { execFileSync } from "node:child_process";

const out = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
});
const [info] = JSON.parse(out);
const paths = info.files.map((f) => f.path);

const allowedRoot = new Set(["package.json", "README.md", "LICENSE"]);
const bad = paths.filter(
  (p) =>
    p.endsWith(".map") ||
    /(^|\/)tests?\//.test(p) ||
    /\.test\.[cm]?[jt]s$/.test(p) ||
    (!p.startsWith("dist/") && !allowedRoot.has(p)),
);

if (!paths.includes("dist/cli.js"))
  bad.push("(missing dist/cli.js; run build first)");

if (bad.length > 0) {
  globalThis.console.error(
    "Unexpected tarball contents:\n" + bad.map((p) => `  ${p}`).join("\n"),
  );
  process.exit(1);
}
globalThis.console.log(`Tarball OK: ${paths.length} files, ${info.size} bytes`);
