---
title: 资源
description: 提供客户端可以读取的文件、记录和实时数据，并支持带类型的 URI 模板。
group: 指南
---

# 资源

资源是客户端可以读取并附加到对话中的数据：文件、数据库记录、API 响应。工具由模型调用，资源通常由用户或应用来选择。

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## URI 模板

在 URI 中放入 `{variables}`，就可以提供一整类资源。变量的类型直接从字符串推导：

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: async ({ owner, repo }) => {
    //           ^? { owner: string; repo: string }
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`);
    return res.text();
  },
});
```

| 语法 | 匹配 | 示例 |
| --- | --- | --- |
| `{name}` | 一个路径段，不含 `/`、`?` 或 `#` | `users://{id}` 匹配 `users://42` |
| `{+name}` | 任意内容，包括 `/` | `files://{+path}` 匹配 `files://src/index.ts` |

变量值会先做 URL 解码，再传给 `read`。静态资源出现在 `resources/list` 中，模板出现在 `resources/templates/list` 中。

## 返回值

| `read` 返回 | 发送的内容 |
| --- | --- |
| `string` | 文本，类型为 `mimeType` 或 `text/plain` |
| `Uint8Array` | base64 二进制数据，类型为 `mimeType` 或 `application/octet-stream` |
| `{ uri, text }` 或 `{ uri, blob }` 的数组 | 原样发送这些内容 |
| 其他任何值 | 它的 JSON，类型为 `application/json` |

`read` 的第二个参数是上下文，并附带所请求的 `uri`：

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## 选项

| 选项 | 说明 |
| --- | --- |
| `name` | 显示给用户的标识，默认为 URI。 |
| `title` | 显示名称。 |
| `description` | 资源包含什么内容。 |
| `mimeType` | `read` 返回内容的类型。 |
| `annotations` | `audience`、`priority` 和 `lastModified` 提示。 |

## 未找到

当没有任何资源匹配某个 URI 时，picomcp 会返回协议错误 `-32002 Resource not found`。如果某个 URI 匹配了模板，但实际并不存在，请抛出同样错误码的 `McpError`：

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## 在工具中链接资源

工具可以把模型引向某个资源，而不是直接把内容塞进去。这样大块数据在真正需要之前，都不会占用上下文：

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
