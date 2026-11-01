import { getCommits, type Commit } from "./git.js";

export const API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_COMMITS = 200;

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export const NO_KEY_MESSAGE =
  "The summary command needs an Anthropic API key. Set ANTHROPIC_API_KEY and run again.";

/** Build the prompt sent to the model from a list of commits. */
export function buildPrompt(commits: Commit[], days: number): string {
  const lines = commits
    .slice(0, MAX_COMMITS)
    .map((c) => `- ${c.date.slice(0, 10)} ${c.authorName}: ${c.subject}`);
  return [
    `Summarize the work done in this git repository over the last ${days} day(s).`,
    "Write a short plain-English summary (3-6 sentences or bullets) grouped by theme.",
    "",
    "Commits:",
    ...lines,
  ].join("\n");
}

/** Call the Claude Messages API and return the text of the reply. */
export async function requestSummary(
  prompt: string,
  apiKey: string,
  fetchFn: FetchLike = fetch as unknown as FetchLike,
  model: string = DEFAULT_MODEL,
): Promise<string> {
  const res = await fetchFn(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Claude API request failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Claude API returned an empty response");
  return text;
}

/** Summarize commits from the last `days` days; never throws on a missing key. */
export async function summarize(
  cwd: string,
  days: number,
  env: NodeJS.ProcessEnv = process.env,
  fetchFn?: FetchLike,
): Promise<string> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return NO_KEY_MESSAGE;
  const commits = await getCommits(cwd, { since: `${days} days ago` });
  if (commits.length === 0) return `No commits in the last ${days} day(s).`;
  return requestSummary(buildPrompt(commits, days), apiKey, fetchFn);
}
