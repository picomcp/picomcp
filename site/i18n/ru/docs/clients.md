---
title: Подключение клиента
description: Настройка Claude Code, Claude Desktop, Cursor, VS Code и MCP Inspector.
group: Начало работы
---

# Подключение клиента

Все MCP-клиенты запускают локальный сервер одинаково: выполняют команду и общаются с ней через stdio. До удалённых серверов клиенты добираются по URL через Streamable HTTP. Во всех конфигурациях ниже используйте абсолютные пути.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Добавьте `--scope project`, чтобы записать сервер в `.mcp.json` и поделиться им с командой.

## Claude Desktop

Отредактируйте `claude_desktop_config.json` (Настройки → Разработчик → Изменить конфигурацию) и перезапустите приложение:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/main.ts"]
    }
  }
}
```

## Cursor

Создайте `.cursor/mcp.json` в проекте или `~/.cursor/mcp.json` для всех проектов:

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Создайте `.vscode/mcp.json`:

```json
{
  "servers": {
    "weather": { "type": "stdio", "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## MCP Inspector

```sh
npx @modelcontextprotocol/inspector node /absolute/path/main.ts
```

Чтобы отладить HTTP-сервер, запустите его через `serve({ http: 3000 })`, откройте Inspector, выберите **Streamable HTTP** и введите `http://127.0.0.1:3000/mcp`. Inspector работает на localhost, а picomcp разрешает его по умолчанию.

## Bun и Deno

Замените `node` на свою среду выполнения:

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Решение проблем

**Клиент не показывает ни одного инструмента.** Выполните команду из конфигурации сами. Если она завершается или выводит ошибку, клиент видит то же самое.

**«Unexpected token» или ошибки JSON в логе клиента.** Что-то записало в stdout. При работе через stdio picomcp перенаправляет `console.log` в stderr, но другие библиотеки могут писать в `process.stdout` напрямую.

**Node не запускает файлы `.ts`.** Обновитесь до Node 22.18 или новее либо запускайте сервер через Bun.
