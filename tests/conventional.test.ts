import { describe, expect, it } from "vitest";
import { parseConventionalCommit } from "../src/conventional.js";

describe("parseConventionalCommit", () => {
  it("parses type and description", () => {
    expect(parseConventionalCommit("feat: add thing")).toEqual({
      type: "feat",
      scope: null,
      breaking: false,
      description: "add thing",
      body: "",
    });
  });

  it("parses scope", () => {
    const c = parseConventionalCommit("fix(health): handle empty repo");
    expect(c?.type).toBe("fix");
    expect(c?.scope).toBe("health");
  });

  it("detects breaking change via bang", () => {
    expect(parseConventionalCommit("feat(api)!: drop v1")?.breaking).toBe(true);
    expect(parseConventionalCommit("feat!: drop v1")?.breaking).toBe(true);
  });

  it("detects breaking change via footer", () => {
    const c = parseConventionalCommit(
      "refactor: rework\n\nSome body.\n\nBREAKING CHANGE: config renamed",
    );
    expect(c?.breaking).toBe(true);
    expect(c?.body).toContain("Some body.");
  });

  it("accepts BREAKING-CHANGE footer", () => {
    expect(
      parseConventionalCommit("feat: x\n\nBREAKING-CHANGE: y")?.breaking,
    ).toBe(true);
  });

  it("lowercases the type and handles CRLF", () => {
    const c = parseConventionalCommit("FEAT: Loud\r\n\r\nbody");
    expect(c?.type).toBe("feat");
    expect(c?.body).toBe("body");
  });

  it("returns null for non-conventional messages", () => {
    expect(parseConventionalCommit("Update readme")).toBeNull();
    expect(parseConventionalCommit("feat:nospace")).toBeNull();
    expect(parseConventionalCommit("")).toBeNull();
  });

  it("treats an empty scope as no scope", () => {
    expect(parseConventionalCommit("fix(): oops")?.scope).toBeNull();
  });
});
