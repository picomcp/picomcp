---
title: Quickstart
description: Scaffold, test and connect your first MCP server in five minutes.
group: Getting started
---

# Quickstart

You need Node 22.18 or later (it runs TypeScript files directly), Bun, or Deno.

## Scaffold a project

```sh
npx picomcp init my-server
cd my-server
npm install
```

This creates a ready-to-run server:

| File | Purpose |
| --- | --- |
| `server.ts` | Your server definition: tools, resources, prompts |
| `main.ts` | Starts the server over stdio |
| `server.test.ts` | A test that calls a tool in-process |

Prefer to start from nothing? Install the two packages and write `server.ts` yourself:

```sh
npm install picomcp zod
```

## Write a tool

Open `server.ts`:

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` is what the model reads to decide when to call the tool. Write it for the model.
- `input` is any [Standard Schema](/docs/schemas). `name` is typed as `string` inside `run`.
- `run` returns a string here. It can also return objects, content blocks or throw: see [Tools](/docs/tools).

## Test it

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` is type-checked: a typo in the tool name or a missing argument fails to compile.

## Connect it

For Claude Code:

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Then ask Claude to greet someone. For Claude Desktop, Cursor, VS Code and others, see [Connect a client](/docs/clients).

## Inspect it

The MCP Inspector lets you call tools by hand and see the raw messages:

```sh
npx @modelcontextprotocol/inspector node main.ts
```
