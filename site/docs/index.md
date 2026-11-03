---
title: Introduction
description: What picomcp is, what it is not, and the ten lines that explain it.
group: Getting started
---

# Introduction

picomcp is a TypeScript framework for building [Model Context Protocol](https://modelcontextprotocol.io) servers. An MCP server gives an AI application (Claude, Cursor, VS Code, your own agent) **tools** it can call, **resources** it can read and **prompts** it can offer to the user.

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

That is a complete server. Run it with `node server.ts` and connect it to any MCP client.

## Why picomcp

- **Small.** About 4 kB gzipped, zero dependencies. The whole library fits in your head and in a code review.
- **Typed from your schema.** Pass a Zod, Valibot or ArkType schema. Your handler gets typed arguments, the client gets a JSON Schema, invalid calls get a readable error.
- **Runs anywhere.** Node 22+, Bun, Deno, Cloudflare Workers and every runtime with `fetch`. No Node built-ins in the core.
- **Two transports, one server.** stdio for desktop clients, Streamable HTTP for remote servers. Switch with one option.
- **Testable without a client.** `server.call("forecast", { city: "Lyon" })` runs a tool in-process, fully typed.
- **Verified against the official SDK.** The test suite drives picomcp with `@modelcontextprotocol/sdk` over both transports.

## What picomcp is not

picomcp implements the server side of MCP and nothing else. It does not include a client, an agent loop or an LLM SDK. It favours the stateless request/response half of the protocol, which is what most servers need. Server-initiated features such as sampling and elicitation are not supported yet: see [Protocol coverage](/docs/protocol) for the exact list.

## Next steps

- [Quickstart](/docs/quickstart): build and connect a server in five minutes.
- [Tools](/docs/tools): everything a tool can do.
- [For AI agents](/docs/agents): give your coding agent the docs in one URL.
