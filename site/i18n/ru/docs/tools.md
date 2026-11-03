---
title: Инструменты
description: Определение инструментов, проверка входных данных, возврат текста, объектов и медиа, ошибки и отмена.
group: Руководства
---

# Инструменты

Инструмент — это функция, которую может вызвать модель. Зарегистрируйте его через `server.tool(name, config)`:

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

## Настройки

| Параметр | Тип | Описание |
| --- | --- | --- |
| `description` | `string` | Что делает инструмент и когда его использовать. Этот текст читает модель. |
| `title` | `string` | Отображаемое имя для клиентов. |
| `input` | Standard Schema | Схема аргументов. Не указывайте её для инструментов без аргументов. |
| `output` | Standard Schema | Схема структурированного результата. См. [Структурированный вывод](#структурированный-вывод). |
| `annotations` | `ToolAnnotations` | Подсказки для клиентов: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | Обработчик. Может быть асинхронным. |

Имя инструмента — от 1 до 128 символов, только буквы, цифры, `_`, `.` и `-`. Некорректное или повторяющееся имя сразу приводит к ошибке: проблема обнаружится при запуске сервера, а не когда модель вызовет инструмент.

## Проверка входных данных

picomcp проверяет аргументы по вашей схеме до вызова `run`. Значения по умолчанию и преобразования применяются, поэтому в примере `limit` внутри `run` всегда число.

Если проверка не прошла, инструмент не вызывается. Клиент получает ошибку инструмента с именем неверного поля, чтобы модель исправила вызов и повторила попытку:

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Возвращаемые значения

Возвращайте то, что удобно. picomcp превратит это в результат MCP:

| `run` возвращает | Клиент получает |
| --- | --- |
| `string` | Один текстовый блок |
| объект, массив или число | Его JSON в виде текста. Объекты также отправляются как `structuredContent`. |
| блок содержимого или массив блоков | Эти блоки как есть |
| `{ content: [...] }` | Результат как есть, для полного контроля |
| `undefined` | Пустой результат |

Блоки содержимого создаются вспомогательными функциями:

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Структурированный вывод

Объявите схему `output`, если результат обрабатывают клиенты или код, а не только модель:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

Тогда picomcp:

1. объявляет схему как `outputSchema` в `tools/list`;
2. проверяет на уровне типов значение, которое возвращает `run`;
3. проверяет значение во время выполнения и отправляет его как `structuredContent`, вместе с JSON-копией в тексте для старых клиентов.

Если значение не подходит, клиент получает ошибку инструмента вместо некорректных данных.

## Ошибки

Выбросьте ошибку в `run`. Её сообщение станет ошибкой инструмента (`isError: true`), которую модель прочитает и на которую сможет отреагировать:

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Пишите сообщения об ошибках для модели: что пошло не так и что делать дальше.

Ошибки инструментов — часть обычного диалога. Ошибки протокола — нет: используйте `McpError`, только когда неверен сам запрос, например у пользователя нет доступа:

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Отмена

Второй аргумент `run` содержит `AbortSignal`. Он срабатывает, когда клиент отправляет `notifications/cancelled`, обычно потому что пользователь нажал «стоп». Передавайте его в `fetch` и другие API, которые его принимают:

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

После отмены запроса picomcp не отправляет на него ответ, как того требует протокол.

## Метаданные

`ctx.meta` содержит объект `_meta`, который клиент отправил вместе с запросом, если он есть. Клиенты используют его для трассировки и токенов прогресса.

## Как писать хорошие инструменты

- **Одна задача на инструмент.** `create_invoice` и `send_invoice` лучше, чем `invoice(action)`.
- **Описывайте аргументы.** `.describe()` у каждого поля попадает в JSON Schema, которую видит модель.
- **Возвращайте меньше.** Модель платит за каждый токен. Возвращайте важные поля, а не весь ответ API.
- **Аннотируйте честно.** `readOnlyHint: true` позволяет клиентам не спрашивать подтверждения. Никогда не ставьте его на инструмент, который что-то записывает.
