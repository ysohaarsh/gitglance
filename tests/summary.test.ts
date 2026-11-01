import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  NO_KEY_MESSAGE,
  buildPrompt,
  requestSummary,
  summarize,
  type FetchLike,
} from "../src/summary.js";

const commit = {
  hash: "a",
  authorName: "Ann",
  authorEmail: "a@x",
  date: "2026-01-02T00:00:00Z",
  subject: "feat: add thing",
  body: "",
};

function okFetch(text: string): FetchLike {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text }] }),
    text: async () => "",
  }));
}

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), "gg-sum-"));
  const git = (...a: string[]) => execFileSync("git", a, { cwd: dir });
  git("init", "-q");
  git("config", "user.name", "T");
  git("config", "user.email", "t@x");
  writeFileSync(join(dir, "f"), "x");
  git("add", ".");
  git("commit", "-qm", "feat: hello");
  return dir;
}

describe("summary", () => {
  it("builds a prompt listing commits", () => {
    const p = buildPrompt([commit], 7);
    expect(p).toContain("last 7 day(s)");
    expect(p).toContain("- 2026-01-02 Ann: feat: add thing");
  });

  it("returns the model text and sends the key", async () => {
    const f = okFetch(" Did stuff ");
    expect(await requestSummary("p", "k", f)).toBe("Did stuff");
    const init = vi.mocked(f).mock.calls[0]?.[1];
    expect(init?.headers["x-api-key"]).toBe("k");
  });

  it("throws on API errors", async () => {
    const f: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => "bad key",
    });
    await expect(requestSummary("p", "k", f)).rejects.toThrow("401");
  });

  it("degrades gracefully without a key", async () => {
    const f = okFetch("x");
    expect(await summarize(repo(), 7, {}, f)).toBe(NO_KEY_MESSAGE);
    expect(f).not.toHaveBeenCalled();
  });

  it("summarizes a real repo with a mocked API", async () => {
    const f = okFetch("Summary!");
    const out = await summarize(repo(), 7, { ANTHROPIC_API_KEY: "k" }, f);
    expect(out).toBe("Summary!");
    const body = vi.mocked(f).mock.calls[0]?.[1].body ?? "";
    expect(body).toContain("feat: hello");
  });
});
