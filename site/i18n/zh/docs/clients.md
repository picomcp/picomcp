---
title: 连接客户端
description: Claude Code、Claude Desktop、Cursor、VS Code 和 MCP Inspector 的配置方法。
group: 入门
---

# 连接客户端

所有 MCP 客户端启动本地服务器的方式都一样：运行一条命令，并通过 stdio 与它通信。远程服务器则通过 URL，使用 Streamable HTTP 访问。下面所有配置都请使用绝对路径。

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

加上 `--scope project`，服务器会写入 `.mcp.json`，方便与团队共享。

## Claude Desktop

编辑 `claude_desktop_config.json`（设置 → 开发者 → 编辑配置），然后重启应用：

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

在项目中创建 `.cursor/mcp.json`，或创建 `~/.cursor/mcp.json` 让所有项目都能使用：

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

创建 `.vscode/mcp.json`：

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

要调试 HTTP 服务器，先用 `serve({ http: 3000 })` 启动它，打开 Inspector，选择 **Streamable HTTP**，然后输入 `http://127.0.0.1:3000/mcp`。Inspector 运行在 localhost 上，picomcp 默认允许它访问。

## Bun 和 Deno

把 `node` 换成你的运行时：

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## 故障排查

**客户端看不到任何工具。** 自己运行配置里的那条命令。如果它退出或报错，客户端看到的也是同样的结果。

**客户端日志里出现“Unexpected token”或 JSON 错误。** 有东西写入了 stdout。通过 stdio 提供服务时，picomcp 会把 `console.log` 重定向到 stderr，但其他库可能会直接写入 `process.stdout`。

**Node 无法运行 `.ts` 文件。** 升级到 Node 22.18 或更高版本，或者改用 Bun 运行服务器。
