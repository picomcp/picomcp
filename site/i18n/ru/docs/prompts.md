---
title: Промпты
description: Шаблоны промптов, которые пользователь выбирает в клиенте, с проверкой аргументов.
group: Руководства
---

# Промпты

Промпты — это шаблоны, которые пользователь выбирает в клиенте, часто как slash-команды. Они превращают несколько аргументов в одно или несколько сообщений.

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

Клиент покажет `diff` как обязательный аргумент, а `focus` как необязательный, вместе с описаниями. Всё это выводится из схемы.

## Аргументы — это строки

MCP передаёт аргументы промптов строками. Используйте строковые схемы или преобразование типов:

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Некорректные аргументы отклоняются с ошибкой `Invalid params` ещё до вызова `run`.

## Возвращаемые значения

| `run` возвращает | Отправляемые сообщения |
| --- | --- |
| `string` | Одно сообщение пользователя |
| `PromptMessage[]` | Эти сообщения |
| `{ description, messages }` | Полный результат |

Используйте массив для многошаговых шаблонов или чтобы добавить медиа:

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
