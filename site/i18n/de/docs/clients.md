---
title: Client verbinden
description: Konfiguration für Claude Code, Claude Desktop, Cursor, VS Code und den MCP Inspector.
group: Erste Schritte
---

# Client verbinden

Jeder MCP-Client startet einen lokalen Server auf dieselbe Weise: Er führt einen Befehl aus und spricht über stdio mit ihm. Entfernte Server erreicht man per URL über Streamable HTTP. Verwende in allen Konfigurationen unten absolute Pfade.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Mit `--scope project` wird der Server in `.mcp.json` geschrieben und mit deinem Team geteilt.

## Claude Desktop

Bearbeite `claude_desktop_config.json` (Einstellungen → Entwickler → Konfiguration bearbeiten) und starte die App neu:

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

Lege `.cursor/mcp.json` in deinem Projekt an, oder `~/.cursor/mcp.json` für alle Projekte:

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Lege `.vscode/mcp.json` an:

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

Um einen HTTP-Server zu untersuchen, starte ihn mit `serve({ http: 3000 })`, öffne den Inspector, wähle **Streamable HTTP** und gib `http://127.0.0.1:3000/mcp` ein. Der Inspector läuft auf localhost, was picomcp standardmäßig erlaubt.

## Bun und Deno

Ersetze `node` durch deine Runtime:

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Fehlerbehebung

**Der Client zeigt keine Tools.** Führe den Befehl aus der Konfiguration selbst aus. Wenn er sich beendet oder einen Fehler ausgibt, sieht der Client dasselbe.

**„Unexpected token“ oder JSON-Fehler im Client-Log.** Etwas hat auf stdout geschrieben. picomcp leitet `console.log` beim Betrieb über stdio nach stderr um, aber andere Bibliotheken schreiben eventuell direkt in `process.stdout`.

**Node kann keine `.ts`-Dateien ausführen.** Aktualisiere auf Node 22.18 oder neuer, oder starte den Server mit Bun.
