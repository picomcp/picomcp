/** The picomcp-docs package: parsing and ranking over the real llms-full.txt. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { find, parse, search, type Page } from "../packages/docs/src/docs.ts";

const SITE = "https://picomcp.github.io/picomcp";
let pages: Page[];

beforeAll(() => {
  execFileSync(process.execPath, ["site/build.ts"], { stdio: "ignore", env: { ...process.env, SITE_URL: SITE } });
  pages = parse(readFileSync("site/dist/llms-full.txt", "utf8"), SITE);
}, 30_000);

describe("picomcp-docs", () => {
  it("splits llms-full.txt into one page per doc", () => {
    expect(pages.length).toBeGreaterThanOrEqual(10);
    for (const page of pages) {
      expect(page.title).not.toBe("");
      expect(page.url.startsWith(`${SITE}/`)).toBe(true);
      expect(page.body.startsWith(`# ${page.title}`)).toBe(true);
    }
  });

  it("finds a page by title or slug, ignoring case and .md", () => {
    expect(find(pages, "Tools")?.title).toBe("Tools");
    expect(find(pages, "tools")?.title).toBe("Tools");
    expect(find(pages, "tools.md")?.title).toBe("Tools");
    expect(find(pages, "no such page")).toBeUndefined();
  });

  it("ranks the page about a topic first", () => {
    expect(search(pages, "deploy cloudflare")[0]?.title).toBe("Deploy");
    expect(search(pages, "testing")[0]?.title).toBe("Testing");
    expect(search(pages, "zzzzqqq")).toEqual([]);
  });
});
