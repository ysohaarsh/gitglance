import { describe, expect, it } from "vitest";
import { csvField, formatCsv } from "../src/csv.js";

describe("csvField", () => {
  it("leaves plain values alone", () => {
    expect(csvField("abc")).toBe("abc");
    expect(csvField(3)).toBe("3");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("a\nb")).toBe('"a\nb"');
  });
});

describe("formatCsv", () => {
  it("emits a header plus contributor and hotspot rows", () => {
    const out = formatCsv(
      [{ name: "Doe, Jane", email: "j@x.io", commits: 4 }],
      [{ path: "src/a.ts", commits: 2 }],
    );
    expect(out.split("\n")).toEqual([
      "section,name,email,commits",
      'contributor,"Doe, Jane",j@x.io,4',
      "hotspot,src/a.ts,,2",
    ]);
  });

  it("returns only the header when there is no data", () => {
    expect(formatCsv([], [])).toBe("section,name,email,commits");
  });
});
