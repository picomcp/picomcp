/**
 * End-to-end tests against the official MCP TypeScript SDK client.
 * If these pass, real clients (Claude, Cursor, VS Code…) can talk to picomcp.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "./fixtures/weather.ts";

async function exercise(client: Client) {
  expect(client.getServerVersion()).toEqual({ name: "weather", version: "1.0.0" });
  expect(client.getServerCapabilities()).toEqual({ tools: {}, resources: {}, prompts: {} });

  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name)).toEqual(["forecast"]);
  expect(tools[0]?.outputSchema).toMatchObject({ type: "object" });

  const result = await client.callTool({ name: "forecast", arguments: { city: "Lyon" } });
  expect(result.structuredContent).toEqual({ city: "Lyon", sky: "clear" });

  const invalid = await client.callTool({ name: "forecast", arguments: {} });
  expect(invalid.isError).toBe(true);

  const { resourceTemplates } = await client.listResourceTemplates();
  expect(resourceTemplates[0]?.uriTemplate).toBe("weather://cities/{city}");
  const { contents } = await client.readResource({ uri: "weather://cities/Paris" });
  expect(contents).toEqual([{ uri: "weather://cities/Paris", mimeType: "text/plain", text: "Lovely Paris" }]);

  const prompt = await client.getPrompt({ name: "plan", arguments: { city: "Rome" } });
  expect(prompt.messages[0]?.content).toEqual({ type: "text", text: "Plan a trip to Rome" });

  await client.ping();
}

describe("official SDK client over stdio", () => {
  it("completes a full session", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("./fixtures/weather.ts", import.meta.url)), "stdio"],
      stderr: "pipe",
    });
    const client = new Client({ name: "interop", version: "1.0.0" });
    await client.connect(transport);
    try {
      await exercise(client);
    } finally {
      await client.close();
    }
  });
});

describe("official SDK client over Streamable HTTP", () => {
  let running: Awaited<ReturnType<typeof server.serve>>;
  beforeAll(async () => {
    running = await server.serve({ http: { port: 0 } });
  });
  afterAll(() => running.close());

  it("completes a full session", async () => {
    const client = new Client({ name: "interop", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(running.url!)));
    try {
      await exercise(client);
    } finally {
      await client.close();
    }
  });

  it("blocks cross-origin browser requests by default", async () => {
    const res = await fetch(running.url!, {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).toBe(403);
  });

  it("allows localhost origins and answers CORS preflight", async () => {
    const res = await fetch(running.url!, { method: "OPTIONS", headers: { origin: "http://localhost:6274" } });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:6274");
  });

  it("returns 404 outside the endpoint path and 405 for GET", async () => {
    expect((await fetch(running.url!.replace("/mcp", "/other"))).status).toBe(404);
    expect((await fetch(running.url!)).status).toBe(405);
  });

  it("answers notifications with 202 and bad JSON with 400", async () => {
    const post = (body: string) => fetch(running.url!, { method: "POST", headers: { "content-type": "application/json" }, body });
    expect((await post(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))).status).toBe(202);
    expect((await post("{nope")).status).toBe(400);
  });
});
