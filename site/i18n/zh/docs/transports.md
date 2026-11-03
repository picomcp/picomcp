---
title: 传输方式
description: 本地客户端用 stdio，远程客户端用 Streamable HTTP，二者都基于同一个 fetch 处理函数。
group: 指南
---

# 传输方式

传输方式负责在客户端和你的服务器之间传递 JSON-RPC 消息。picomcp 支持 MCP 定义的两种传输方式，切换时你的工具无需改动。

## stdio

```ts
await server.serve();
```

客户端把你的服务器作为子进程启动，通过 stdin 和 stdout 交换以换行分隔的 JSON。桌面客户端和编程智能体就是这样使用本地服务器的。

stdout 专属于协议。通过 stdio 提供服务时，picomcp 会把 `console.log`、`console.info` 和 `console.debug` 重定向到 stderr，所以一行误打的日志不会破坏连接。客户端通常会在日志中显示 stderr。

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` 会在当前运行的 Bun、Deno 或 Node 上启动一个服务器。选项：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `port` | `3000` | 监听端口。`0` 表示自动选择空闲端口。 |
| `hostname` | `"127.0.0.1"` | 用 `"0.0.0.0"` 接受来自其他机器的连接。 |
| `path` | `"/mcp"` | 端点路径。其他路径返回 404。 |

它返回 `{ url, close() }`。

## fetch 处理函数

`server.fetch` 是一个符合 Web 标准的 `(Request) => Promise<Response>` 函数。可以把它交给任何支持 `fetch` 的运行时或框架：

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` 不检查路径，需要你自己把请求路由给它。更多平台见[部署](/docs/deploy)。

## picomcp 如何使用 HTTP

picomcp 以无状态 JSON 模式运行 Streamable HTTP：

- 带有 JSON-RPC 消息或批量消息的 `POST` → 返回 `200` 和 JSON 响应，通知则返回 `202`。
- `GET` 和 `DELETE` → 返回 `405`，告诉客户端不提供服务器到客户端的流。
- `OPTIONS` → 为允许的来源处理 CORS 预检。
- 不支持的 `MCP-Protocol-Version` 请求头 → 返回 `400`。

不需要保存会话，所以任何实例都能响应任何请求。这让 picomcp 无需额外工作就能适配 serverless 平台、负载均衡和自动扩缩容。

## 来源检查与 DNS 重绑定

浏览器会发送 `Origin` 请求头。恶意网页可能借此访问你机器上的服务器，所以 picomcp 会检查它：

- 没有 `Origin` 的请求（CLI、服务器、桌面应用）始终允许。
- 默认只允许 `localhost`、`127.0.0.1` 和 `[::1]` 来源，端口不限。
- 其他来源返回 `403`。

用 `origins` 选项允许更多来源：

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## 自定义传输方式

`server.handle(message)` 处理一条 JSON-RPC 消息或一批消息，并返回响应；对于通知，它返回 `undefined`。用它可以把 picomcp 接入 WebSocket、消息队列或其他任何通道：

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
