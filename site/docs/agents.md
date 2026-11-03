---
title: For AI agents
description: Machine-readable docs, llms.txt, Markdown pages and rules to give your coding agent.
group: For AI agents
---

# For AI agents

Coding agents write a lot of MCP servers. These docs are built to be read by them as well as by you.

## Machine-readable docs

| URL | Contents |
| --- | --- |
| [`/llms.txt`](/llms.txt) | Index of every page with a one-line summary, in the [llms.txt](https://llmstxt.org) format |
| [`/llms-full.txt`](/llms-full.txt) | The whole documentation as one Markdown file |
| `/docs/<page>.md` | Any page as Markdown. Add `.md` to its URL, e.g. [`/docs/tools.md`](/docs/tools.md) |

Every page also has a **Copy as Markdown** button, to paste it into a chat.

These files are in English, the reference language and the one models follow best. Each translation also has its own `llms-full.txt`, for example `/fr/llms-full.txt`.

## Point your agent at the docs

Paste this into your agent's instructions, for example in `AGENTS.md` or `CLAUDE.md` at the root of your project:

```md
## MCP servers

This project builds MCP servers with picomcp.

- Read https://picomcp.github.io/picomcp/llms-full.txt before writing picomcp code.
- Define servers with `pico({ name })` and chain `.tool()`, `.resource()`, `.prompt()`.
- Use Zod 4 schemas with `.describe()` on every field.
- Write tool descriptions and error messages for the model: say what the tool does,
  when to use it, and what to do after an error.
- Never write to stdout in a stdio server. Use `console.error` for logs.
- Test tools with `server.call(name, input)`. Do not spawn a client in unit tests.
```

## Give your agent a docs server

The docs are also available as an MCP server, [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), built with picomcp. It gives agents three tools, `list_docs`, `search_docs` and `read_doc`, and every page as a resource.

In Claude Code:

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

In Cursor, Windsurf, Claude Desktop and most other clients, add it to the MCP config file (`.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

The source is in [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), about 100 lines long.

## Facts agents get wrong

These are the mistakes models make most often when they write MCP servers, and how they work in picomcp:

- **stdout is the protocol in stdio mode.** A `console.log` would corrupt it. picomcp redirects console output to stderr while serving over stdio, but `process.stdout.write` is still unsafe.
- **Tool errors are results, not exceptions.** Throwing inside `run` produces `isError: true` with your message. The model sees it and can retry. Do not catch errors only to return `"Error: ..."` strings.
- **Prompt arguments are strings.** Use `z.coerce.number()` for numeric prompt arguments.
- **JSON Schema comes from the schema library.** Zod 4 and ArkType need nothing. Valibot needs `toStandardJsonSchema`. Others need `withJsonSchema`.
- **`server.fetch` ignores the path.** Route `/mcp` to it yourself, or use `serve({ http })`, which only answers on `/mcp`.
- **Typed `server.call` requires chaining.** `pico().tool().tool()` keeps the types. Separate statements lose them.

## Contributing with an agent

The repository has an [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) with the rules for working on picomcp itself: the size budget, the test commands and the design constraints.
