---
title: Connect a client
description: Configuration for Claude Code, Claude Desktop, Cursor, VS Code and the MCP Inspector.
group: Getting started
---

# Connect a client

Every MCP client starts a local server the same way: it runs a command and talks to it over stdio. Remote servers are reached by URL over Streamable HTTP. Use absolute paths in every config below.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Add `--scope project` to write the server to `.mcp.json` and share it with your team.

## Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config), then restart the app:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/main.ts"]
    }
  }
}
```

## Cursor

Create `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for every project:

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "weather": { "type": "stdio", "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## MCP Inspector

```sh
npx @modelcontextprotocol/inspector node /absolute/path/main.ts
```

To inspect an HTTP server, start it with `serve({ http: 3000 })`, open the Inspector, pick **Streamable HTTP** and enter `http://127.0.0.1:3000/mcp`. The Inspector runs on localhost, which picomcp allows by default.

## Bun and Deno

Replace `node` with your runtime:

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Troubleshooting

**The client shows no tools.** Run the command from the config yourself. If it exits or prints an error, the client sees the same thing.

**"Unexpected token" or JSON errors in the client log.** Something wrote to stdout. picomcp redirects `console.log` to stderr while serving over stdio, but other libraries may write to `process.stdout` directly.

**Node says it cannot run `.ts` files.** Upgrade to Node 22.18 or later, or run the server with Bun.
