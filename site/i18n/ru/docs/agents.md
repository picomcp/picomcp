---
title: Для ИИ-агентов
description: Машиночитаемая документация, llms.txt, страницы в Markdown и правила для вашего агента.
group: Для ИИ-агентов
---

# Для ИИ-агентов

Агенты для программирования пишут много MCP-серверов. Эта документация устроена так, чтобы её было удобно читать и им, и вам.

## Машиночитаемая документация

| URL | Содержимое |
| --- | --- |
| [`/llms.txt`](/llms.txt) | Индекс всех страниц с описанием в одну строку, в формате [llms.txt](https://llmstxt.org) |
| [`/llms-full.txt`](/llms-full.txt) | Вся документация в одном файле Markdown |
| `/docs/<page>.md` | Любая страница в Markdown. Добавьте `.md` к её адресу, например [`/docs/tools.md`](/docs/tools.md) |

На каждой странице также есть кнопка **Копировать как Markdown**, чтобы вставить её в чат.

Эти файлы на английском: это эталонный язык, и модели лучше всего следуют именно ему. У каждого перевода есть и свой `llms-full.txt`, например `/fr/llms-full.txt`.

## Укажите агенту на документацию

Вставьте это в инструкции агента, например в `AGENTS.md` или `CLAUDE.md` в корне проекта:

```md
## MCP servers

This project builds MCP servers with picomcp.

- Read https://picomcp.github.io/picomcp/llms-full.txt before writing picomcp code.
- Define servers with `pico({ name })` and chain `.tool()`, `.resource()`, `.prompt()`.
- Use Zod 4 schemas with `.describe()` on every field.
- Write tool descriptions and error messages for the model: say what the tool does,
  when to use it, and what to do after an error.
- Never write to stdout in a stdio server. Use `console.error` for logs.
- Test tools with `server.call(name, input)`. Do not spawn a client in unit tests.
```

## Дайте агенту сервер документации

Документация доступна и как MCP-сервер [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), построенный на picomcp. Он даёт агентам три инструмента, `list_docs`, `search_docs` и `read_doc`, и каждую страницу как ресурс.

В Claude Code:

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

В Cursor, Windsurf, Claude Desktop и большинстве других клиентов добавьте его в файл конфигурации MCP (`.cursor/mcp.json` для Cursor):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

Исходный код лежит в [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), около 100 строк.

## В чём агенты часто ошибаются

Вот ошибки, которые модели чаще всего допускают при написании MCP-серверов, и как всё устроено в picomcp:

- **В режиме stdio stdout — это протокол.** `console.log` его испортит. picomcp перенаправляет вывод консоли в stderr при работе через stdio, но `process.stdout.write` по-прежнему опасен.
- **Ошибки инструментов — это результаты, а не исключения.** Ошибка внутри `run` даёт `isError: true` с вашим сообщением. Модель видит его и может повторить попытку. Не перехватывайте ошибки только ради того, чтобы вернуть строку `"Error: ..."`.
- **Аргументы промптов — это строки.** Для числовых аргументов используйте `z.coerce.number()`.
- **JSON Schema берётся из библиотеки схем.** Zod 4 и ArkType ничего не требуют. Valibot требует `toStandardJsonSchema`. Остальные — `withJsonSchema`.
- **`server.fetch` не смотрит на путь.** Направляйте к нему `/mcp` сами или используйте `serve({ http })`, который отвечает только на `/mcp`.
- **Типизированный `server.call` требует цепочки.** `pico().tool().tool()` сохраняет типы. Отдельные инструкции их теряют.

## Участие в разработке с агентом

В репозитории есть [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) с правилами работы над самим picomcp: бюджет размера, команды для тестов и ограничения архитектуры.
