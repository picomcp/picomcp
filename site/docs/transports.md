---
title: Transports
description: stdio for local clients, Streamable HTTP for remote ones, and the fetch handler that powers both.
group: Guides
---

# Transports

A transport carries JSON-RPC messages between the client and your server. picomcp supports the two that MCP defines. Your tools do not change between them.

## stdio

```ts
await server.serve();
```

The client starts your server as a child process and exchanges newline-delimited JSON over stdin and stdout. This is what desktop clients and coding agents use for local servers.

stdout belongs to the protocol. While serving over stdio, picomcp redirects `console.log`, `console.info` and `console.debug` to stderr, so a stray log line cannot break the connection. Clients usually show stderr in their logs.

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` starts a server on Bun, Deno or Node, whichever is running. Options:

| Option | Default | Description |
| --- | --- | --- |
| `port` | `3000` | Port to listen on. `0` picks a free one. |
| `hostname` | `"127.0.0.1"` | Use `"0.0.0.0"` to accept connections from other machines. |
| `path` | `"/mcp"` | Endpoint path. Other paths answer 404. |

It returns `{ url, close() }`.

## The fetch handler

`server.fetch` is a Web-standard `(Request) => Promise<Response>` function. Hand it to any runtime or framework that speaks `fetch`:

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` does not look at the path. Route requests to it yourself. More platforms in [Deploy](/docs/deploy).

## How picomcp speaks HTTP

picomcp runs Streamable HTTP in stateless JSON mode:

- `POST` with a JSON-RPC message or batch → `200` with a JSON answer, or `202` for notifications.
- `GET` and `DELETE` → `405`, which tells clients that no server-to-client stream is offered.
- `OPTIONS` → CORS preflight for allowed origins.
- An unsupported `MCP-Protocol-Version` header → `400`.

There are no sessions to store, so any instance can answer any request. This makes picomcp fit serverless platforms, load balancers and autoscaling without extra work.

## Origins and DNS rebinding

Browsers send an `Origin` header. A malicious page could use it to reach a server on your machine, so picomcp checks it:

- Requests without `Origin` (CLIs, servers, desktop apps) are always allowed.
- By default only `localhost`, `127.0.0.1` and `[::1]` origins are allowed, on any port.
- Other origins get `403`.

Allow more with the `origins` option:

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## Custom transports

`server.handle(message)` processes one JSON-RPC message, or a batch, and returns the response. It returns `undefined` for notifications. Use it to plug picomcp into WebSockets, message queues or anything else:

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
