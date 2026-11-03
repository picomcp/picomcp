---
title: Ресурсы
description: Файлы, записи и живые данные, которые может читать клиент, с типизированными шаблонами URI.
group: Руководства
---

# Ресурсы

Ресурсы — это данные, которые клиент может прочитать и прикрепить к диалогу: файлы, строки базы данных, ответы API. Инструменты вызывает модель, а ресурсы обычно выбирает пользователь или приложение.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## Шаблоны URI

Добавьте в URI `{variables}`, чтобы обслуживать целое семейство ресурсов. Типы переменных выводятся из самой строки:

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

| Синтаксис | Совпадает с | Пример |
| --- | --- | --- |
| `{name}` | Один сегмент пути, без `/`, `?` и `#` | `users://{id}` совпадает с `users://42` |
| `{+name}` | Чем угодно, включая `/` | `files://{+path}` совпадает с `files://src/index.ts` |

Значения декодируются из URL до передачи в `read`. Статические ресурсы появляются в `resources/list`, шаблоны — в `resources/templates/list`.

## Возвращаемые значения

| `read` возвращает | Отправляемое содержимое |
| --- | --- |
| `string` | Текст, с `mimeType` или `text/plain` |
| `Uint8Array` | Blob в base64, с `mimeType` или `application/octet-stream` |
| массив `{ uri, text }` или `{ uri, blob }` | Это содержимое как есть |
| любое другое значение | Его JSON, как `application/json` |

`read` получает контекст вторым аргументом, дополненный запрошенным `uri`:

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Параметры

| Параметр | Описание |
| --- | --- |
| `name` | Идентификатор, который видят пользователи. По умолчанию — URI. |
| `title` | Отображаемое имя. |
| `description` | Что содержит ресурс. |
| `mimeType` | Тип содержимого, которое возвращает `read`. |
| `annotations` | Подсказки `audience`, `priority` и `lastModified`. |

## Ресурс не найден

Если ни один ресурс не совпадает с URI, picomcp отвечает ошибкой протокола `-32002 Resource not found`. Чтобы отклонить URI, который совпадает с шаблоном, но ни на что не указывает, выбросьте `McpError` с тем же кодом:

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Ссылки из инструментов

Инструмент может указать модели на ресурс, а не встраивать его. Так большие данные не попадают в контекст, пока они не нужны:

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
