---
title: 协议覆盖范围
description: picomcp 具体实现了 MCP 规范的哪些部分，哪些尚未实现。
group: 参考
---

# 协议覆盖范围

picomcp 以 MCP `2025-11-25` 为目标，并可协商降级到 `2025-06-18`、`2025-03-26` 和 `2024-11-05`。所有标记为支持的功能都有测试覆盖，包括与官方 TypeScript SDK 客户端的端到端测试。

## 已支持

| 领域 | 功能 |
| --- | --- |
| 生命周期 | 带版本协商的 `initialize`、`notifications/initialized`、`ping` |
| 工具 | `tools/list`、`tools/call`、输入校验、`outputSchema` 和 `structuredContent`、标注、标题 |
| 内容 | 文本、图片、音频、资源链接、内嵌资源 |
| 资源 | `resources/list`、`resources/templates/list`、`resources/read`、文本和二进制内容 |
| 提示词 | `prompts/list`、`prompts/get`、从 schema 推导的参数 |
| 实用功能 | 基于 `AbortSignal` 的 `notifications/cancelled` |
| JSON-RPC | 批量消息、错误码、忽略客户端发来的响应 |
| stdio | 以换行分隔的 JSON，stdout 不受误打日志影响 |
| Streamable HTTP | 无状态 JSON 响应，通知返回 `202`，`GET` 返回 `405`，CORS，检查 `Origin` 和 `MCP-Protocol-Version` |

## 尚未支持

| 功能 | 原因 |
| --- | --- |
| Sampling、elicitation、roots | 需要服务器向客户端发送请求。picomcp 的无状态设计目前还没有为此保持一个开放通道。 |
| 日志、进度和 `list_changed` 通知 | 同样的原因：都是服务器发给客户端的消息。 |
| 资源订阅 | 同样的原因。 |
| 自动补全 | 已列入计划。 |
| 分页游标 | 列表会一次性完整返回，适合条目在几百个以内的服务器。 |
| 会话（`Mcp-Session-Id`）和 SSE 流 | 无状态模式下不需要。 |
| Tasks | 在规范中仍是实验性功能。 |

需要其中某项功能？请[提交 issue](https://github.com/picomcp/picomcp/issues)并描述你的使用场景。只要能在不让 picomcp 变臃肿的前提下加入，新功能就会到来。
