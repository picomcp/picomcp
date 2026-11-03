---
title: ツール
description: ツールの定義、入力の検証、テキスト・オブジェクト・メディアの返却、エラー報告、キャンセル処理。
group: ガイド
---

# ツール

ツールは、モデルが呼び出せる関数です。`server.tool(name, config)` で登録します：

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

## 設定

| オプション | 型 | 説明 |
| --- | --- | --- |
| `description` | `string` | ツールが何をするか、いつ使うか。モデルはこの文章を読みます。 |
| `title` | `string` | クライアントに表示される名前。 |
| `input` | Standard Schema | 引数のスキーマ。引数のないツールでは省略します。 |
| `output` | Standard Schema | 構造化された結果のスキーマ。[構造化出力](#構造化出力)を参照。 |
| `annotations` | `ToolAnnotations` | クライアント向けのヒント：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`。 |
| `run` | `(input, ctx) => value` | ハンドラー。非同期でもかまいません。 |

ツール名は 1〜128 文字で、英字、数字、`_`、`.`、`-` だけを使えます。不正な名前や重複した名前を登録するとすぐにエラーになるので、ミスはモデルがツールを呼んだときではなく、サーバーの起動時に見つかります。

## 入力の検証

picomcp は `run` を呼ぶ前に、スキーマで引数を検証します。デフォルト値と変換も適用されるので、上の例では `run` の中の `limit` は必ず数値です。

検証に失敗した場合、ツールは呼ばれません。クライアントには問題のあるフィールドを示すツールエラーが返るので、モデルは呼び出しを直して再試行できます：

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## 戻り値

自然な形で返してください。picomcp が MCP の結果に変換します：

| `run` の戻り値 | クライアントが受け取るもの |
| --- | --- |
| `string` | テキストブロック 1 つ |
| オブジェクト、配列、数値 | その JSON をテキストとして。オブジェクトは `structuredContent` としても送られます。 |
| コンテンツブロック、またはその配列 | それらのブロックをそのまま |
| `{ content: [...] }` | 結果をそのまま。細かく制御したいとき向け |
| `undefined` | 空の結果 |

コンテンツブロックはヘルパーで作ります：

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## 構造化出力

結果をモデルだけでなくクライアントやコードでも使う場合は、`output` スキーマを宣言します：

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

すると picomcp は：

1. `tools/list` でスキーマを `outputSchema` として公開し、
2. `run` の戻り値を型レベルでチェックし、
3. 実行時にも値を検証して `structuredContent` として送ります。古いクライアント向けに JSON のテキストも添えます。

値がスキーマに合わない場合、クライアントは壊れたデータではなくツールエラーを受け取ります。

## エラー

`run` の中でエラーを投げてください。そのメッセージはツールエラー（`isError: true`）になり、モデルはそれを読んで対応できます：

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

エラーメッセージはモデルに向けて書きましょう。何がうまくいかなかったのか、次に何をすべきかを伝えます。

ツールエラーは通常の会話の一部ですが、プロトコルエラーは違います。`McpError` は、ユーザーに権限がないなど、リクエスト自体が誤っている場合にだけ使ってください：

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## キャンセル

`run` の第 2 引数には `AbortSignal` が入っています。クライアントが `notifications/cancelled` を送ると発火します。たいていはユーザーが停止ボタンを押したときです。`fetch` など、シグナルを受け付ける API に渡してください：

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

リクエストがキャンセルされると、プロトコルの規定どおり、picomcp はそのリクエストに応答を返しません。

## メタデータ

クライアントがリクエストに `_meta` オブジェクトを付けて送った場合、`ctx.meta` に入ります。クライアントはこれをトレースや進捗トークンに使います。

## 良いツールを書くために

- **1 つのツールに 1 つの仕事。** `invoice(action)` よりも `create_invoice` と `send_invoice` のほうが良い設計です。
- **引数を説明する。** 各フィールドの `.describe()` は、モデルが見る JSON Schema に反映されます。
- **返す量を減らす。** モデルはトークンごとにコストがかかります。API レスポンス全体ではなく、必要なフィールドだけを返しましょう。
- **正直にアノテーションする。** `readOnlyHint: true` があると、クライアントは確認を省略できます。書き込みを行うツールには絶対に付けないでください。
