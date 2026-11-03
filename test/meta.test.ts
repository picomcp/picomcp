/** Repository invariants that are easy to break by hand. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("repository", () => {
  it("keeps package.json, jsr.json and the CLI on the same version", () => {
    const version = JSON.parse(read("package.json")).version;
    expect(JSON.parse(read("jsr.json")).version).toBe(version);
    expect(read("src/cli.ts")).toContain(`const VERSION = "${version}";`);
  });

  it("has no runtime dependencies", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(pkg.peerDependencies ?? {}).toEqual({});
  });

  it("imports no Node built-ins in the library core", () => {
    for (const file of ["server", "types", "schema", "content", "http", "listen", "stdio", "constants", "index"]) {
      expect(read(`src/${file}.ts`), file).not.toMatch(/from\s+["']node:/);
    }
  });
});
