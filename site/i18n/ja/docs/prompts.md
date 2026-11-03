---
title: プロンプト
description: ユーザーがクライアントで選べる再利用可能なプロンプトテンプレートを、引数の検証付きで提供します。
group: ガイド
---

# プロンプト

プロンプトは、ユーザーがクライアントで選ぶテンプレートです。スラッシュコマンドとして表示されることがよくあります。いくつかの引数を、1 つ以上のメッセージに変換します。

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

クライアントには `diff` が必須、`focus` が任意として、それぞれの説明とともに表示されます。どれもスキーマから導かれます。

## 引数は文字列

MCP はプロンプトの引数を文字列として送ります。文字列のスキーマを使うか、型変換してください：

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

不正な引数は、`run` が呼ばれる前に `Invalid params` エラーで拒否されます。

## 戻り値

| `run` の戻り値 | 送られるメッセージ |
| --- | --- |
| `string` | ユーザーメッセージ 1 つ |
| `PromptMessage[]` | それらのメッセージ |
| `{ description, messages }` | 完全な結果 |

複数ターンのテンプレートやメディアを含める場合は、配列を使います：

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
