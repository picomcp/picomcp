# picomcp-docs

The [picomcp](https://github.com/picomcp/picomcp) documentation as an MCP server. Add it to Claude Code, Cursor or any MCP client, and your coding agent can search and read the picomcp docs while it writes your MCP server.

It is built with picomcp itself, in about 100 lines: [read the source](https://github.com/picomcp/picomcp/tree/main/packages/docs/src).

## Install

**Claude Code**

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

**Cursor, Windsurf, Claude Desktop and other clients**: add it to the MCP config file (`.cursor/mcp.json` for Cursor, `claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

Needs Node 22 or later.

## Tools

| Tool | What it does |
| --- | --- |
| `list_docs` | Lists every documentation page, with its URL |
| `search_docs` | Finds the pages that match a query, with a short excerpt |
| `read_doc` | Returns a full page as Markdown, by title (`Tools`) or slug (`tools`) |

Every page is also available as a resource, `picomcp-docs://{title}`.

## How it works

The server downloads [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt) from the docs site on the first call and keeps it in memory. It always serves the latest published docs, with no update to install.

Set `PICOMCP_DOCS` to read from another copy of the site, for example a local build at `http://localhost:4321`.

## License

MIT
