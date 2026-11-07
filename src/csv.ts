import type { FileChurn } from "./churn.js";
import type { Contributor } from "./stats.js";

/** Quote a CSV field when it contains a comma, quote or newline (RFC 4180). */
export function csvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Render contributors and hotspots as one CSV table with the columns
 * `section,name,email,commits`. Hotspot rows carry the path in `name` and an
 * empty `email`.
 */
export function formatCsv(
  contributors: Contributor[],
  hotspots: FileChurn[],
): string {
  const rows: (string | number)[][] = [
    ["section", "name", "email", "commits"],
    ...contributors.map((c) => ["contributor", c.name, c.email, c.commits]),
    ...hotspots.map((h) => ["hotspot", h.path, "", h.commits]),
  ];
  return rows.map((r) => r.map(csvField).join(",")).join("\n");
}
