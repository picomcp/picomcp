/** The docs search must forgive typos. These run against the real built index. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error plain JS module with JSDoc types
import { createIndex, distance, excerpt, search } from "../site/assets/search.js";

let index: ReturnType<typeof createIndex>;
const top = (q: string, n = 3) => search(index, q, n).map((r: { doc: { h: string } }) => r.doc.h);

beforeAll(() => {
  execFileSync(process.execPath, ["site/build.ts"], { stdio: "ignore" });
  index = createIndex(JSON.parse(readFileSync("site/dist/search.json", "utf8")));
}, 30_000);

describe("distance", () => {
  it("counts insertions, deletions, substitutions and transpositions as one edit", () => {
    expect(distance("tool", "tools", 2)).toBe(1);
    expect(distance("tools", "tool", 2)).toBe(1);
    expect(distance("tolls", "tools", 2)).toBe(1);
    expect(distance("tolos", "tools", 2)).toBe(1);
    expect(distance("abc", "xyz", 1)).toBe(2);
  });
});

describe("search", () => {
  it("finds exact words", () => {
    expect(top("cancellation")).toContain("Cancellation");
  });

  it("forgives typos", () => {
    expect(top("cancelation")).toContain("Cancellation");
    expect(top("resouce templates")).toContain("URI templates");
    expect(top("strucutred output")).toContain("Structured output");
    expect(top("promtps", 5)).toContain("Prompts");
    expect(top("cloudflare wokrers")).toContain("Cloudflare Workers");
  });

  it("matches the word being typed as a prefix", () => {
    expect(top("valib")).toContain("Valibot");
    expect(top("deplo")).toContain("Deploy");
  });

  it("ignores case and accents", () => {
    expect(top("ÁRKTYPE")).toContain("ArkType");
  });

  it("falls back to any-word matches instead of returning nothing", () => {
    expect(top("zod xylophone").length).toBeGreaterThan(0);
  });

  it("returns nothing for gibberish", () => {
    expect(top("qqqqzzzz")).toEqual([]);
  });

  it("highlights matched words in excerpts and escapes HTML", () => {
    expect(excerpt("Use <b>tools</b> wisely", new Set(["tools"]))).toBe("Use &#60;b&#62;<mark>tools</mark>&#60;/b&#62; wisely");
  });
});
