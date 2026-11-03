---
title: 快速上手
description: 五分钟内创建、测试并连接你的第一个 MCP 服务器。
group: 入门
---

# 快速上手

你需要 Node 22.18 或更高版本（可直接运行 TypeScript 文件）、Bun 或 Deno。

## 创建项目

```sh
npx picomcp init my-server
cd my-server
npm install
```

这会生成一个可以直接运行的服务器：

| 文件 | 用途 |
| --- | --- |
| `server.ts` | 服务器定义：工具、资源、提示词 |
| `main.ts` | 通过 stdio 启动服务器 |
| `server.test.ts` | 在进程内调用工具的测试 |

想从零开始？安装这两个包，自己编写 `server.ts`：

```sh
npm install picomcp zod
```

## 编写一个工具

打开 `server.ts`：

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

- 模型会读取 `description` 来决定何时调用这个工具。请写给模型看。
- `input` 可以是任意 [Standard Schema](/docs/schemas)。在 `run` 中，`name` 的类型是 `string`。
- 这里 `run` 返回一个字符串。它也可以返回对象、内容块，或者抛出错误，详见[工具](/docs/tools)。

## 测试

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

`server.call` 会经过类型检查：工具名拼错或缺少参数都无法通过编译。

## 连接

在 Claude Code 中：

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

然后让 Claude 跟某人打个招呼。Claude Desktop、Cursor、VS Code 等客户端的配置见[连接客户端](/docs/clients)。

## 调试

MCP Inspector 可以手动调用工具，并查看原始消息：

```sh
npx @modelcontextprotocol/inspector node main.ts
```
