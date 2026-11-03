---
title: Für KI-Agenten
description: Maschinenlesbare Doku, llms.txt, Markdown-Seiten und Regeln für deinen Coding-Agenten.
group: Für KI-Agenten
---

# Für KI-Agenten

Coding-Agenten schreiben viele MCP-Server. Diese Doku ist so gebaut, dass sie sie genauso gut lesen können wie du.

## Maschinenlesbare Doku

| URL | Inhalt |
| --- | --- |
| [`/llms.txt`](/llms.txt) | Index aller Seiten mit einer einzeiligen Zusammenfassung, im [llms.txt](https://llmstxt.org)-Format |
| [`/llms-full.txt`](/llms-full.txt) | Die gesamte Dokumentation in einer Markdown-Datei |
| `/docs/<page>.md` | Jede Seite als Markdown. Häng `.md` an ihre URL, zum Beispiel [`/docs/tools.md`](/docs/tools.md) |

Jede Seite hat außerdem einen Button **Als Markdown kopieren**, um sie in einen Chat einzufügen.

Diese Dateien sind auf Englisch, der Referenzsprache, der Modelle am besten folgen. Jede Übersetzung hat zusätzlich eine eigene `llms-full.txt`, zum Beispiel `/fr/llms-full.txt`.

## Deinen Agenten auf die Doku hinweisen

Füge das in die Anweisungen deines Agenten ein, zum Beispiel in `AGENTS.md` oder `CLAUDE.md` im Wurzelverzeichnis deines Projekts:

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

## Deinem Agenten einen Doku-Server geben

Die Doku gibt es auch als MCP-Server, [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), gebaut mit picomcp. Er gibt Agenten drei Tools, `list_docs`, `search_docs` und `read_doc`, und jede Seite als Ressource.

In Claude Code:

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

In Cursor, Windsurf, Claude Desktop und den meisten anderen Clients trägst du ihn in die MCP-Konfigurationsdatei ein (`.cursor/mcp.json` bei Cursor):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

Der Quellcode liegt in [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), rund 100 Zeilen lang.

## Was Agenten oft falsch machen

Das sind die häufigsten Fehler von Modellen beim Schreiben von MCP-Servern, und wie es in picomcp funktioniert:

- **Im stdio-Modus ist stdout das Protokoll.** Ein `console.log` würde es beschädigen. picomcp leitet die Konsolenausgabe beim Betrieb über stdio nach stderr um, aber `process.stdout.write` bleibt unsicher.
- **Tool-Fehler sind Ergebnisse, keine Exceptions.** Ein Fehler in `run` ergibt `isError: true` mit deiner Meldung. Das Modell sieht sie und kann es erneut versuchen. Fang Fehler nicht ab, nur um `"Error: ..."`-Strings zurückzugeben.
- **Prompt-Argumente sind Strings.** Verwende `z.coerce.number()` für numerische Prompt-Argumente.
- **Das JSON Schema kommt aus der Schema-Bibliothek.** Zod 4 und ArkType brauchen nichts. Valibot braucht `toStandardJsonSchema`. Andere brauchen `withJsonSchema`.
- **`server.fetch` ignoriert den Pfad.** Leite `/mcp` selbst dorthin, oder nutze `serve({ http })`, das nur auf `/mcp` antwortet.
- **Typisiertes `server.call` braucht Verkettung.** `pico().tool().tool()` behält die Typen. Getrennte Anweisungen verlieren sie.

## Mit einem Agenten beitragen

Das Repository enthält eine [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) mit den Regeln für die Arbeit an picomcp selbst: das Größenbudget, die Testbefehle und die Designvorgaben.
