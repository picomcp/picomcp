---
title: Collegare un client
description: Configurazione per Claude Code, Claude Desktop, Cursor, VS Code e MCP Inspector.
group: Per iniziare
---

# Collegare un client

Tutti i client MCP avviano un server locale allo stesso modo: eseguono un comando e gli parlano via stdio. I server remoti si raggiungono tramite URL, con Streamable HTTP. Usa percorsi assoluti in tutte le configurazioni qui sotto.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Aggiungi `--scope project` per scrivere il server in `.mcp.json` e condividerlo con il tuo team.

## Claude Desktop

Modifica `claude_desktop_config.json` (Impostazioni → Sviluppatore → Modifica configurazione), poi riavvia l’app:

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

Crea `.cursor/mcp.json` nel tuo progetto, oppure `~/.cursor/mcp.json` per tutti i progetti:

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Crea `.vscode/mcp.json`:

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

Per ispezionare un server HTTP, avvialo con `serve({ http: 3000 })`, apri l’Inspector, scegli **Streamable HTTP** e inserisci `http://127.0.0.1:3000/mcp`. L’Inspector gira su localhost, che picomcp consente per impostazione predefinita.

## Bun e Deno

Sostituisci `node` con il tuo runtime:

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Risoluzione dei problemi

**Il client non mostra alcun tool.** Esegui tu stesso il comando della configurazione. Se termina o stampa un errore, il client vede la stessa cosa.

**«Unexpected token» o errori JSON nei log del client.** Qualcosa ha scritto su stdout. picomcp reindirizza `console.log` su stderr quando serve via stdio, ma altre librerie potrebbero scrivere direttamente su `process.stdout`.

**Node non riesce a eseguire i file `.ts`.** Aggiorna a Node 22.18 o successivo, oppure avvia il server con Bun.
