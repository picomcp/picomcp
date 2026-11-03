---
title: スキーマ
description: Zod、Valibot、ArkType など任意の Standard Schema ライブラリの使い方と、JSON Schema の生成方法。
group: ガイド
---

# スキーマ

picomcp はスキーマライブラリを同梱していません。[Standard Schema](https://standardschema.dev) を実装したライブラリならどれでも受け付け、MCP クライアントに必要な JSON Schema を [Standard JSON Schema](https://standardschema.dev/json-schema) 経由で生成します。使い慣れたライブラリをそのまま使えて、picomcp は小さいままです。

## Zod 4

そのまま使えます：

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

そのまま使えます：

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot は JSON Schema のサポートを別パッケージに分けています。スキーマを `toStandardJsonSchema` で包んでください：

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## その他のライブラリ

Standard Schema で検証はできても JSON Schema を生成できないライブラリ（たとえば Zod 3）の場合は、`withJsonSchema` で自分で JSON Schema を添えます：

```ts
import { withJsonSchema } from "picomcp";

server.tool("forecast", {
  input: withJsonSchema(schema, {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  }),
  run: ({ city }) => getForecast(city),
});
```

これがないと、ツールの登録時にまさにそのことを伝えるエラーが投げられます。問題がクライアントまで届くことはありません。

## 型の流れ

- `run` が受け取るのはスキーマの**出力**型です。デフォルト値と変換が適用された後の型です。
- `server.call()` が受け付けるのはスキーマの**入力**型です。そのため、テストではデフォルト値のあるフィールドを省略できます。
- `output` スキーマがある場合、`run` はそのスキーマの入力型を返す必要があります。

## モデルが理解しやすいスキーマのコツ

- すべてのフィールドに説明を付ける。説明は、モデルが読むドキュメントそのものです。
- 取りうる値が決まっているなら、自由記述より enum を使う。
- 任意の挙動にはデフォルト値を使い、モデルが引数を省略できるようにする。
- オブジェクトはフラットに保つ。深くネストした引数は、モデルが正しく埋めにくくなります。
