---
title: Protocol coverage
description: Exactly which parts of the MCP specification picomcp implements, and which it does not yet.
group: Reference
---

# Protocol coverage

picomcp targets MCP `2025-11-25` and negotiates down to `2025-06-18`, `2025-03-26` and `2024-11-05`. Every feature marked as supported is covered by tests, including end-to-end tests against the official TypeScript SDK client.

## Supported

| Area | Feature |
| --- | --- |
| Lifecycle | `initialize` with version negotiation, `notifications/initialized`, `ping` |
| Tools | `tools/list`, `tools/call`, input validation, `outputSchema` and `structuredContent`, annotations, titles |
| Content | text, image, audio, resource links, embedded resources |
| Resources | `resources/list`, `resources/templates/list`, `resources/read`, text and binary contents |
| Prompts | `prompts/list`, `prompts/get`, arguments derived from schemas |
| Utilities | `notifications/cancelled` with `AbortSignal` |
| JSON-RPC | Batches, error codes, responses to client results ignored |
| stdio | Newline-delimited JSON, stdout protected from stray logs |
| Streamable HTTP | Stateless JSON responses, `202` for notifications, `405` for `GET`, CORS, `Origin` checks, `MCP-Protocol-Version` checks |

## Not supported yet

| Feature | Why |
| --- | --- |
| Sampling, elicitation, roots | They need the server to send requests to the client. picomcp's stateless design does not hold a channel open for that yet. |
| Logging, progress and `list_changed` notifications | Same reason: server-to-client messages. |
| Resource subscriptions | Same reason. |
| Completions | Planned. |
| Pagination cursors | Lists are returned in full, which suits servers with up to hundreds of entries. |
| Sessions (`Mcp-Session-Id`) and SSE streams | Not needed in stateless mode. |
| Tasks | Experimental in the spec. |

Want one of these? [Open an issue](https://github.com/picomcp/picomcp/issues) and describe your use case. Features land when they can be added without making picomcp large.
