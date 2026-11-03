---
title: 测试
description: 在进程内带完整类型地测试工具，再端到端地测试协议。
group: 指南
---

# 测试

## 在进程内调用工具

`server.call(name, input)` 会像客户端一样运行工具，但不需要传输层，也不需要子进程。校验、默认值、输出检查和错误处理全部照常生效。

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

它适用于任何测试运行器：Vitest、`node:test`、`bun test`、`deno test`。

## 经过类型检查的调用

当工具以链式方式注册时，`call` 知道它们的名称和输入：

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

如果你在不同的语句中注册工具，`server` 的类型就无法跟踪它们，`call` 会接受任何名称。请使用链式调用，或者重新赋值：`const app = server.tool(...)`。

## 测试协议

`server.handle` 接受原始 JSON-RPC，适合用来检查列表和 schema：

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

给 `tools/list` 做快照，是发现 schema 改动影响了模型所见内容的一种低成本方法。

## 用真实客户端测试

做端到端测试时，可以用官方 SDK 的客户端通过 HTTP 驱动服务器：

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

picomcp 自己的测试套件正是这样做的，覆盖 stdio 和 HTTP 两种方式。
