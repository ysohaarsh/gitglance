import { parseConventionalCommit } from "./conventional.js";
import { getCommits, type Commit } from "./git.js";

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
