---
title: 提示词
description: 提供可复用的提示词模板，用户可在客户端中选择，参数经过校验。
group: 指南
---

# 提示词

提示词是用户在客户端中选择的模板，通常以斜杠命令的形式出现。它们把几个参数变成一条或多条消息。

```ts
server.prompt("review", {
  title: "Code review",
  description: "Review a diff for bugs and style issues.",
  args: z.object({
    diff: z.string().describe("The diff to review"),
    focus: z.string().optional().describe("What to pay attention to"),
  }),
  run: ({ diff, focus }) => `Review this diff${focus ? `, focusing on ${focus}` : ""}:\n\n${diff}`,
});
```

客户端会把 `diff` 显示为必填、`focus` 显示为可选，并附上它们的说明，这些都从 schema 推导而来。

## 参数都是字符串

MCP 以字符串形式发送提示词参数。请使用字符串 schema，或进行类型转换：

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

无效参数会在调用 `run` 之前被拒绝，并返回 `Invalid params` 错误。

## 返回值

| `run` 返回 | 发送的消息 |
| --- | --- |
| `string` | 一条用户消息 |
| `PromptMessage[]` | 这些消息 |
| `{ description, messages }` | 完整结果 |

多轮模板或需要包含媒体时，请返回数组：

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
