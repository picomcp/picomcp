/**
 * The picomcp-docs package: parsing and ranking over the real English docs.
 * The llms-full.txt text is assembled in memory from site/docs, in the same shape the site generator writes,
 * so this test never builds the site: search.test.ts does, and two parallel builds race on site/dist.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { find, parse, search } from "../packages/docs/src/docs.ts";

const SITE = "https://picomcp.github.io/picomcp";

const llmsFull = readdirSync("site/docs")
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const source = readFileSync(`site/docs/${file}`, "utf8");
    const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? file;
    const body = source.replace(/^---\n[\s\S]*?\n---\n+/, "").replace(/^# .+\n+/, "");
    return `# ${title}\nSource: ${SITE}/docs/${file.replace(/\.md$/, "")}\n\n${body}\n`;
  })
  .join("\n---\n\n");

const pages = parse(llmsFull, SITE);

describe("picomcp-docs", () => {
  it("splits llms-full.txt into one page per doc", () => {
    expect(pages.length).toBe(readdirSync("site/docs").filter((f) => f.endsWith(".md")).length);
    for (const page of pages) {
      expect(page.title).not.toBe("");
      expect(page.url.startsWith(`${SITE}/docs/`)).toBe(true);
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
