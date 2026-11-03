---
title: リソース
description: クライアントが読み取れるファイル、レコード、ライブデータを、型付きの URI テンプレートで公開します。
group: ガイド
---

# リソース

リソースは、クライアントが読み取って会話に添付できるデータです。ファイル、データベースの行、API レスポンスなどがあります。ツールはモデルが呼び出しますが、リソースは通常ユーザーやアプリケーションが選びます。

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## URI テンプレート

URI に `{variables}` を入れると、同じ種類のリソースをまとめて提供できます。変数の型は文字列そのものから推論されます：

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

| 構文 | マッチするもの | 例 |
| --- | --- | --- |
| `{name}` | パスの 1 セグメント。`/`、`?`、`#` を含まない | `users://{id}` は `users://42` にマッチ |
| `{+name}` | `/` を含むあらゆる文字列 | `files://{+path}` は `files://src/index.ts` にマッチ |

値は URL デコードされてから `read` に渡されます。静的なリソースは `resources/list` に、テンプレートは `resources/templates/list` に表示されます。

## 戻り値

| `read` の戻り値 | 送られる内容 |
| --- | --- |
| `string` | テキスト。`mimeType` または `text/plain` |
| `Uint8Array` | base64 の blob。`mimeType` または `application/octet-stream` |
| `{ uri, text }` または `{ uri, blob }` の配列 | それらの内容をそのまま |
| その他の値 | その JSON。`application/json` |

`read` の第 2 引数にはコンテキストが渡され、要求された `uri` も含まれます：

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## オプション

| オプション | 説明 |
| --- | --- |
| `name` | ユーザーに表示される識別子。デフォルトは URI。 |
| `title` | 表示名。 |
| `description` | リソースの内容。 |
| `mimeType` | `read` が返す内容の種類。 |
| `annotations` | `audience`、`priority`、`lastModified` のヒント。 |

## 見つからない場合

URI にマッチするリソースがない場合、picomcp はプロトコルエラー `-32002 Resource not found` を返します。テンプレートにはマッチするものの実体がない URI を拒否するには、同じコードで `McpError` を投げます：

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## ツールからリンクする

ツールは、リソースの中身を埋め込む代わりに、モデルにリソースを指し示すことができます。大きなデータを、必要になるまでコンテキストに入れずに済みます：

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
