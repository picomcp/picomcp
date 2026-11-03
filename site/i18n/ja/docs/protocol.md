---
title: プロトコル対応状況
description: picomcp が MCP 仕様のどの部分を実装していて、どの部分がまだなのか。
group: リファレンス
---

# プロトコル対応状況

picomcp は MCP `2025-11-25` を対象とし、`2025-06-18`、`2025-03-26`、`2024-11-05` へのネゴシエーションにも対応しています。対応済みとした機能はすべてテストでカバーされており、公式 TypeScript SDK のクライアントを使ったエンドツーエンドのテストも含まれます。

## 対応済み

| 領域 | 機能 |
| --- | --- |
| ライフサイクル | バージョンネゴシエーション付きの `initialize`、`notifications/initialized`、`ping` |
| ツール | `tools/list`、`tools/call`、入力の検証、`outputSchema` と `structuredContent`、アノテーション、タイトル |
| コンテンツ | テキスト、画像、音声、リソースリンク、埋め込みリソース |
| リソース | `resources/list`、`resources/templates/list`、`resources/read`、テキストとバイナリのコンテンツ |
| プロンプト | `prompts/list`、`prompts/get`、スキーマから導かれる引数 |
| ユーティリティ | `AbortSignal` による `notifications/cancelled` |
| JSON-RPC | バッチ、エラーコード、クライアントからのレスポンスは無視 |
| stdio | 改行区切りの JSON、うっかり出力したログから stdout を保護 |
| Streamable HTTP | ステートレスな JSON レスポンス、通知には `202`、`GET` には `405`、CORS、`Origin` と `MCP-Protocol-Version` のチェック |

## 未対応

| 機能 | 理由 |
| --- | --- |
| Sampling、elicitation、roots | サーバーからクライアントへリクエストを送る必要があります。picomcp のステートレスな設計では、そのためのチャネルをまだ開いたままにしていません。 |
| ログ、進捗、`list_changed` の通知 | 同じ理由です。サーバーからクライアントへのメッセージです。 |
| リソースの購読 | 同じ理由です。 |
| 補完 | 予定しています。 |
| ページネーションのカーソル | 一覧はすべて一度に返します。数百件程度までのサーバーならこれで十分です。 |
| セッション（`Mcp-Session-Id`）と SSE ストリーム | ステートレスモードでは不要です。 |
| Tasks | 仕様上まだ実験的な機能です。 |

どれかが必要ですか？ [issue を作成](https://github.com/picomcp/picomcp/issues)して、ユースケースを教えてください。picomcp を大きくせずに追加できる機能から取り入れていきます。
