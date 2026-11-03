---
title: 简介
description: picomcp 是什么、不是什么，以及解释它的那十行代码。
group: 入门
---

# 简介

picomcp 是一个用于构建 [Model Context Protocol](https://modelcontextprotocol.io) 服务器的 TypeScript 框架。MCP 服务器为 AI 应用（Claude、Cursor、VS Code 或你自己的智能体）提供可以调用的**工具**、可以读取的**资源**，以及可以提供给用户的**提示词**。

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

这就是一个完整的服务器。用 `node server.ts` 运行它，然后连接到任意 MCP 客户端。

## 为什么选择 picomcp

- **小巧。** gzip 后约 4 kB，零依赖。整个库可以装进你的脑子里，一次代码评审就能看完。
- **类型来自你的 schema。** 传入 Zod、Valibot 或 ArkType 的 schema。处理函数拿到带类型的参数，客户端拿到 JSON Schema，无效调用会得到清晰易读的错误。
- **随处运行。** Node 22+、Bun、Deno、Cloudflare Workers，以及任何提供 `fetch` 的运行时。核心不含任何 Node 内置模块。
- **两种传输方式，同一个服务器。** 桌面客户端用 stdio，远程服务器用 Streamable HTTP。改一个选项即可切换。
- **无需客户端即可测试。** `server.call("forecast", { city: "Lyon" })` 在进程内直接运行工具，类型完整。
- **经官方 SDK 验证。** 测试套件通过 `@modelcontextprotocol/sdk` 在两种传输方式上驱动 picomcp。

## picomcp 不是什么

picomcp 只实现 MCP 的服务器端。它不包含客户端、智能体循环或 LLM SDK。它专注于协议中无状态、请求/响应的那一半，这正是大多数服务器需要的。由服务器发起的功能（如 sampling 和 elicitation）目前尚不支持，详细列表见[协议覆盖范围](/docs/protocol)。

## 下一步

- [快速上手](/docs/quickstart)：五分钟内构建并连接一个服务器。
- [工具](/docs/tools)：工具能做的一切。
- [写给 AI 智能体](/docs/agents)：用一个网址把文档交给你的编程智能体。
