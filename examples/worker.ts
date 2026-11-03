/**
 * Remote MCP server on Cloudflare Workers (or any fetch-based runtime).
 *
 *   npx wrangler deploy examples/worker.ts
 *   claude mcp add --transport http notes https://notes.<you>.workers.dev/mcp
 */
import { z } from "zod";
import { pico } from "picomcp";

const notes = new Map<string, string>();

const server = pico({ name: "notes", version: "1.0.0", origins: ["https://claude.ai"] })
  .tool("add_note", {
    description: "Save a note under a title.",
    input: z.object({ title: z.string(), body: z.string() }),
    run: ({ title, body }) => {
      notes.set(title, body);
      return `Saved "${title}".`;
    },
  })
  .tool("list_notes", {
    description: "List saved note titles.",
    annotations: { readOnlyHint: true },
    run: () => [...notes.keys()],
  });

export default {
  async fetch(request: Request, env: { TOKEN: string }): Promise<Response> {
    if (new URL(request.url).pathname !== "/mcp") return new Response("Not found", { status: 404 });
    if (request.headers.get("authorization") !== `Bearer ${env.TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    return server.fetch(request);
  },
};
