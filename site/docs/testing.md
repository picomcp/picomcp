---
title: Testing
description: Test tools in-process with full types, then test the protocol end to end.
group: Guides
---

# Testing

## Call tools in-process

`server.call(name, input)` runs a tool exactly as a client would, without a transport or a subprocess. Validation, defaults, output checks and error handling all apply.

```ts
import { describe, expect, it } from "vitest";
import { server } from "./server.ts";

describe("forecast", () => {
  it("returns the forecast", async () => {
    const result = await server.call("forecast", { city: "Lyon" });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ city: "Lyon" });
  });

  it("explains invalid input to the model", async () => {
    const result = await server.call("forecast", { city: "Lyon", days: 30 });
    expect(result.isError).toBe(true);
  });
});
```

It works with any test runner: Vitest, `node:test`, `bun test`, `deno test`.

## Type-checked calls

When tools are registered by chaining, `call` knows their names and inputs:

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

If you register tools in separate statements, the type of `server` cannot track them and `call` accepts any name. Chain the calls, or reassign: `const app = server.tool(...)`.

## Test the protocol

`server.handle` takes raw JSON-RPC, which is useful to check listings and schemas:

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

A snapshot of `tools/list` is a cheap way to notice when a schema change alters what models see.

## Test with a real client

For end-to-end tests, drive the server with the official SDK client over HTTP:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const running = await server.serve({ http: { port: 0 } });
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(running.url!)));

const { tools } = await client.listTools();

await client.close();
await running.close();
```

picomcp's own test suite does exactly this, over both stdio and HTTP.
