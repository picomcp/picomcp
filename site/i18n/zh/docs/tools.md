---
title: 工具
description: 定义工具、校验输入、返回文本、对象或媒体、报告错误以及处理取消。
group: 指南
---

# 工具

工具是模型可以调用的函数。用 `server.tool(name, config)` 注册一个工具：

```ts
server.tool("search_issues", {
  title: "Search issues",
  description: "Search open GitHub issues in a repository. Use it before filing a new issue.",
  input: z.object({
    repo: z.string().describe("owner/name"),
    query: z.string(),
    limit: z.number().int().max(50).default(10),
  }),
  annotations: { readOnlyHint: true, openWorldHint: true },
  run: async ({ repo, query, limit }, { signal }) => {
    const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} repo:${repo}`)}&per_page=${limit}`, { signal });
    const { items } = await res.json();
    return items.map((i: { title: string; html_url: string }) => `${i.title} — ${i.html_url}`).join("\n");
  },
});
```

## 配置项

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `description` | `string` | 工具做什么、什么时候用。模型会读取这段文字。 |
| `title` | `string` | 客户端显示的名称。 |
| `input` | Standard Schema | 参数的 schema。没有参数的工具可以省略。 |
| `output` | Standard Schema | 结构化结果的 schema。见[结构化输出](#结构化输出)。 |
| `annotations` | `ToolAnnotations` | 给客户端的提示：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`。 |
| `run` | `(input, ctx) => value` | 处理函数，可以是异步的。 |

工具名长度为 1 到 128 个字符，只能包含字母、数字、`_`、`.` 和 `-`。注册无效或重复的名称会立即抛出错误，因此问题在服务器启动时就会暴露，而不是等到模型调用工具时。

## 输入校验

picomcp 在调用 `run` 之前，会用你的 schema 校验参数。默认值和转换都会生效，所以上面例子里的 `limit` 在 `run` 中始终是数字。

校验失败时，工具不会被调用。客户端会收到一个指明出错字段的工具错误，模型可以据此修正调用并重试：

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## 返回值

按最自然的方式返回即可。picomcp 会把它转换成 MCP 结果：

| `run` 返回 | 客户端收到 |
| --- | --- |
| `string` | 一个文本块 |
| 对象、数组或数字 | 以文本形式发送的 JSON。对象还会作为 `structuredContent` 发送。 |
| 一个内容块，或内容块数组 | 原样发送这些内容块 |
| `{ content: [...] }` | 原样发送结果，完全由你掌控 |
| `undefined` | 空结果 |

用辅助函数构建内容块：

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## 结构化输出

当结果要交给客户端或代码处理，而不只是给模型看时，请声明 `output` schema：

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

这样 picomcp 会：

1. 在 `tools/list` 中把该 schema 声明为 `outputSchema`；
2. 在类型层面检查 `run` 的返回值；
3. 在运行时校验返回值，并作为 `structuredContent` 发送，同时附带一份 JSON 文本，供旧版客户端使用。

如果返回值不符合 schema，客户端会收到工具错误，而不是格式错误的数据。

## 错误

在 `run` 中抛出错误。错误信息会变成模型可以读取并作出反应的工具错误（`isError: true`）：

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

错误信息要写给模型看：说明哪里出了问题，以及下一步该怎么做。

工具错误是正常对话的一部分，协议错误则不是。只有当请求本身有问题时才使用 `McpError`，例如用户没有访问权限：

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## 取消

`run` 的第二个参数带有一个 `AbortSignal`。当客户端发送 `notifications/cancelled` 时它会被触发，通常是因为用户点了停止。把它传给 `fetch` 以及其他支持它的 API：

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

请求被取消后，picomcp 不会再为它发送响应，这是协议的要求。

## 元数据

如果客户端随请求发送了 `_meta` 对象，`ctx.meta` 中就会包含它。客户端用它来做链路追踪和进度令牌。

## 写出好工具

- **一个工具只做一件事。** `create_invoice` 和 `send_invoice` 比 `invoice(action)` 更好。
- **描述每个参数。** 每个字段上的 `.describe()` 都会进入模型看到的 JSON Schema。
- **少返回一些。** 模型的每个 token 都有成本。只返回有用的字段，而不是整个 API 响应。
- **如实标注。** `readOnlyHint: true` 会让客户端跳过确认提示。不要把它用在会写入数据的工具上。
