---
title: 写给 AI 智能体
description: 机器可读的文档、llms.txt、Markdown 页面，以及可以交给编程智能体的规则。
group: 写给 AI 智能体
---

# 写给 AI 智能体

编程智能体会编写大量 MCP 服务器。这份文档既是写给你的，也同样是写给它们的。

## 机器可读的文档

| URL | 内容 |
| --- | --- |
| [`/llms.txt`](/llms.txt) | 所有页面的索引，每页附一行摘要，采用 [llms.txt](https://llmstxt.org) 格式 |
| [`/llms-full.txt`](/llms-full.txt) | 完整文档，合并为一个 Markdown 文件 |
| `/docs/<page>.md` | 任意页面的 Markdown 版本。在网址后加上 `.md`，例如 [`/docs/tools.md`](/docs/tools.md) |

每个页面还有一个**复制为 Markdown**按钮，方便粘贴到对话中。

这些文件是英文的：英文是参考语言，也是模型遵循得最好的语言。每种译文也有自己的 `llms-full.txt`，例如 `/fr/llms-full.txt`。

## 让智能体读这份文档

把下面的内容粘贴到智能体的指令中，例如项目根目录下的 `AGENTS.md` 或 `CLAUDE.md`：

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

## 给智能体一个文档服务器

文档也以 MCP 服务器的形式提供：[`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs)，用 picomcp 构建。它为智能体提供三个工具 `list_docs`、`search_docs` 和 `read_doc`，并把每个页面作为资源提供。

在 Claude Code 中：

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

在 Cursor、Windsurf、Claude Desktop 和大多数其他客户端中，把它加入 MCP 配置文件（Cursor 为 `.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

源码位于 [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs)，大约 100 行。

## 智能体常犯的错误

以下是模型编写 MCP 服务器时最常犯的错误，以及它们在 picomcp 中的正确做法：

- **stdio 模式下，stdout 就是协议。** 一个 `console.log` 就会把它弄坏。通过 stdio 提供服务时，picomcp 会把控制台输出重定向到 stderr，但 `process.stdout.write` 依然不安全。
- **工具错误是结果，不是异常。** 在 `run` 中抛出错误，会得到带有你的错误信息的 `isError: true`。模型能看到它并重试。不要为了返回 `"Error: ..."` 字符串而捕获错误。
- **提示词参数都是字符串。** 数值类型的提示词参数请用 `z.coerce.number()`。
- **JSON Schema 来自 schema 库。** Zod 4 和 ArkType 无需额外处理。Valibot 需要 `toStandardJsonSchema`。其他库需要 `withJsonSchema`。
- **`server.fetch` 不检查路径。** 请自己把 `/mcp` 路由给它，或者使用只响应 `/mcp` 的 `serve({ http })`。
- **带类型的 `server.call` 需要链式注册。** `pico().tool().tool()` 会保留类型，分开写的语句会丢失类型。

## 借助智能体参与贡献

仓库里有一份 [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md)，写明了开发 picomcp 本身的规则：体积预算、测试命令和设计约束。
