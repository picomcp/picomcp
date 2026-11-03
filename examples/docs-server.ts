/**
 * The picomcp docs, served as an MCP server — built with picomcp.
 * Lets a coding agent search and read the docs while it writes your server.
 *
 *   claude mcp add picomcp-docs -- node /absolute/path/to/examples/docs-server.ts
 */
import { z } from "zod";
import { pico } from "picomcp";

const SITE = process.env.PICOMCP_DOCS ?? "https://picomcp.github.io/picomcp";

interface Page {
  title: string;
  url: string;
  body: string;
}

let cache: Promise<Page[]> | undefined;

/** Splits llms-full.txt into pages. Each page starts with a `# Title` line followed by `Source: <url>`. */
function pages(): Promise<Page[]> {
  cache ??= fetch(`${SITE}/llms-full.txt`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load the docs (${res.status})`);
      return res.text();
    })
    .then((text) =>
      text
        .split(/^(?=# [^\n]+\nSource: )/m)
        .map((chunk) => {
          const title = chunk.match(/^# (.+)$/m)?.[1] ?? "";
          const url = chunk.match(/^Source: (.+)$/m)?.[1] ?? SITE;
          return { title, url, body: chunk.trim() };
        })
        .filter((page) => page.title),
    );
  return cache;
}

const server = pico({
  name: "picomcp-docs",
  version: "1.0.0",
  instructions: "Search the picomcp docs before writing picomcp code. Read the full page for exact APIs.",
})
  .tool("search_docs", {
    description: "Search the picomcp documentation. Returns matching pages with a short excerpt.",
    input: z.object({ query: z.string().min(2).describe("Words to look for, e.g. 'resource template'") }),
    annotations: { readOnlyHint: true },
    run: async ({ query }) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = (await pages())
        .map((page) => ({ page, score: words.filter((w) => page.body.toLowerCase().includes(w)).length }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (!hits.length) return `No page mentions "${query}".`;
      return hits.map(({ page }) => `## ${page.title}\n${page.url}\n\n${page.body.slice(0, 400)}…`).join("\n\n");
    },
  })
  .resource("picomcp-docs://{title}", {
    description: "A full documentation page, by title.",
    mimeType: "text/markdown",
    read: async ({ title }) => {
      const page = (await pages()).find((p) => p.title.toLowerCase() === title.toLowerCase());
      if (!page) throw new Error(`No page titled "${title}"`);
      return page.body;
    },
  });

await server.serve();
