/**
 * picomcp-docs: the picomcp documentation as an MCP server, built with picomcp.
 * Lets a coding agent search and read the docs while it writes your server.
 *
 *   claude mcp add picomcp-docs -- npx -y picomcp-docs
 *
 * Env: PICOMCP_DOCS, the docs site to read from (default https://picomcp.github.io/picomcp).
 */
import { z } from "zod";
import { pico } from "picomcp";
import { find, parse, search, type Page } from "./docs.ts";

/** Keep in sync with package.json and server.json (checked by `npm run check:version`). */
export const VERSION = "0.1.0";

const SITE = (process.env.PICOMCP_DOCS ?? "https://picomcp.github.io/picomcp").replace(/\/$/, "");

let cache: Promise<Page[]> | undefined;

function pages(): Promise<Page[]> {
  cache ??= fetch(`${SITE}/llms-full.txt`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load the docs from ${SITE} (HTTP ${res.status}). Try again later.`);
      return res.text();
    })
    .then((text) => parse(text, SITE))
    .catch((error: unknown) => {
      cache = undefined; // do not cache a failure: the next call retries
      throw error;
    });
  return cache;
}

const titles = async () => (await pages()).map((p) => `- ${p.title}: ${p.url}`).join("\n");

export const server = pico({
  name: "picomcp-docs",
  version: VERSION,
  instructions:
    "Documentation for picomcp, a TypeScript framework for MCP servers. " +
    "Call search_docs or list_docs before writing picomcp code, then read_doc for exact APIs.",
})
  .tool("list_docs", {
    description: "List every page of the picomcp documentation, with its URL. Use it to pick a page for read_doc.",
    input: z.object({}),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: titles,
  })
  .tool("search_docs", {
    description:
      "Search the picomcp documentation. Returns up to 5 matching pages with a short excerpt. " +
      "Then call read_doc with a title to get the full page.",
    input: z.object({ query: z.string().min(2).describe("Words to look for, e.g. 'resource template' or 'cloudflare'") }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: async ({ query }) => {
      const hits = search(await pages(), query);
      if (!hits.length) return `No page mentions "${query}". Try other words, or call list_docs.\n\n${await titles()}`;
      return hits.map((p) => `## ${p.title}\n${p.url}\n\n${p.body.slice(0, 400)}…`).join("\n\n");
    },
  })
  .tool("read_doc", {
    description: "Read a full page of the picomcp documentation as Markdown.",
    input: z.object({ page: z.string().min(1).describe("Page title from list_docs or search_docs, e.g. 'Tools', or its slug, e.g. 'tools'") }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: async ({ page }) => {
      const hit = find(await pages(), page);
      if (!hit) throw new Error(`No page called "${page}". Pick one of these:\n${await titles()}`);
      return hit.body;
    },
  })
  .resource("picomcp-docs://{title}", {
    description: "A full documentation page, by title.",
    mimeType: "text/markdown",
    read: async ({ title }) => {
      const hit = find(await pages(), title);
      if (!hit) throw new Error(`No page titled "${title}"`);
      return hit.body;
    },
  });
