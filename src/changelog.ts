import { parseConventionalCommit } from "./conventional.js";
import { getCommits, runGit, type Commit } from "./git.js";

export interface ChangelogEntry {
  hash: string;
  scope: string | null;
  description: string;
  breaking: boolean;
}

export interface ChangelogGroup {
  type: string;
  title: string;
  entries: ChangelogEntry[];
}

const TYPE_TITLES: [string, string][] = [
  ["feat", "Features"],
  ["fix", "Bug Fixes"],
  ["perf", "Performance"],
  ["refactor", "Refactoring"],
  ["docs", "Documentation"],
  ["test", "Tests"],
  ["build", "Build"],
  ["ci", "CI"],
  ["chore", "Chores"],
  ["style", "Style"],
  ["revert", "Reverts"],
];
const OTHER_TITLE = "Other Changes";

function titleFor(type: string): string {
  return TYPE_TITLES.find(([t]) => t === type)?.[1] ?? OTHER_TITLE;
}

/**
 * Group commits by Conventional Commit type, in a fixed display order.
 * Commits that are not conventional, or have an unknown type, go under
 * "Other Changes". Entries keep the input (newest first) order.
 */
export function groupCommits(commits: Commit[]): ChangelogGroup[] {
  const groups = new Map<string, ChangelogGroup>();
  for (const commit of commits) {
    const parsed = parseConventionalCommit(
      commit.body ? `${commit.subject}\n\n${commit.body}` : commit.subject,
    );
    const title = parsed ? titleFor(parsed.type) : OTHER_TITLE;
    const key = TYPE_TITLES.find(([, t]) => t === title)?.[0] ?? "other";
    let group = groups.get(key);
    if (!group) {
      group = { type: key, title, entries: [] };
      groups.set(key, group);
    }
    group.entries.push({
      hash: commit.hash,
      scope: parsed?.scope ?? null,
      description: parsed?.description ?? commit.subject,
      breaking: parsed?.breaking ?? false,
    });
  }
  const order = [...TYPE_TITLES.map(([t]) => t), "other"];
  return order.flatMap((t) => groups.get(t) ?? []);
}

/** Render grouped commits as Markdown. */
export function formatChangelog(
  groups: ChangelogGroup[],
  heading: string,
): string {
  const lines = [`## ${heading}`];
  if (groups.length === 0) {
    lines.push("", "No changes.");
    return lines.join("\n");
  }
  for (const group of groups) {
    lines.push("", `### ${group.title}`, "");
    for (const e of group.entries) {
      const scope = e.scope ? `**${e.scope}:** ` : "";
      const breaking = e.breaking ? "**BREAKING** " : "";
      lines.push(
        `- ${breaking}${scope}${e.description} (${e.hash.slice(0, 7)})`,
      );
    }
  }
  return lines.join("\n");
}

/** Commits between two refs (`from` exclusive, `to` inclusive; `to` defaults to HEAD). */
export async function gatherChangelog(
  cwd: string,
  from?: string,
  to = "HEAD",
): Promise<ChangelogGroup[]> {
  const range = from ? `${from}..${to}` : to;
  return groupCommits(await getCommits(cwd, { range }));
}

export interface ChangelogSection {
  heading: string;
  groups: ChangelogGroup[];
}

/** Version-like tags (optional leading "v"), newest version first. */
export async function listVersionTags(cwd: string): Promise<string[]> {
  const out = await runGit(cwd, [
    "tag",
    "--list",
    "--sort=-v:refname",
    "--merged",
    "HEAD",
  ]);
  return out
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => /^v?\d/.test(t));
}

/**
 * One section per version tag (each covering the commits since the previous
 * tag), preceded by "Unreleased" when HEAD has commits after the newest tag.
 * Without tags the whole history is a single "Unreleased" section.
 */
export async function gatherChangelogByTag(
  cwd: string,
): Promise<ChangelogSection[]> {
  const tags = await listVersionTags(cwd);
  const sections: ChangelogSection[] = [];
  const unreleased = await gatherChangelog(cwd, tags[0]);
  if (unreleased.length > 0 || tags.length === 0) {
    sections.push({ heading: "Unreleased", groups: unreleased });
  }
  for (const [i, tag] of tags.entries()) {
    sections.push({
      heading: tag,
      groups: await gatherChangelog(cwd, tags[i + 1], tag),
    });
  }
  return sections;
}

/** Render several sections as one Markdown document. */
export function formatChangelogSections(sections: ChangelogSection[]): string {
  return sections.map((s) => formatChangelog(s.groups, s.heading)).join("\n\n");
}

const CHANGELOG_TITLE = "# Changelog";

/** Split an existing changelog into its title-less body sections keyed by `## ` heading. */
function splitSections(text: string): { heading: string; text: string }[] {
  const body = text.startsWith(CHANGELOG_TITLE)
    ? text.slice(CHANGELOG_TITLE.length)
    : text;
  const parts = body.split(/^(?=## )/m).filter((p) => p.trim() !== "");
  return parts.map((p) => ({
    heading: /^## (.*)$/m.exec(p)?.[1]?.trim() ?? "",
    text: p.trim(),
  }));
}

/**
 * Prepend new sections to existing CHANGELOG.md text. A stale "Unreleased"
 * section is replaced; sections whose heading already exists are not repeated.
 */
export function prependChangelog(
  existing: string,
  sections: ChangelogSection[],
): string {
  const old = splitSections(existing).filter((s) => s.heading !== "Unreleased");
  const known = new Set(old.map((s) => s.heading));
  const fresh = sections
    .filter((s) => s.heading === "Unreleased" || !known.has(s.heading))
    .map((s) => formatChangelog(s.groups, s.heading));
  return `${[CHANGELOG_TITLE, ...fresh, ...old.map((s) => s.text)].join("\n\n")}\n`;
}
