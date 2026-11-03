---
title: Per gli agenti IA
description: Documentazione leggibile dalle macchine, llms.txt, pagine Markdown e regole da dare al tuo agente di programmazione.
group: Per gli agenti IA
---

# Per gli agenti IA

Gli agenti di programmazione scrivono molti server MCP. Questa documentazione è pensata per essere letta da loro tanto quanto da te.

## Documentazione leggibile dalle macchine

| URL | Contenuto |
| --- | --- |
| [`/llms.txt`](/llms.txt) | Indice di tutte le pagine con un riassunto di una riga, nel formato [llms.txt](https://llmstxt.org) |
| [`/llms-full.txt`](/llms-full.txt) | Tutta la documentazione in un unico file Markdown |
| `/docs/<page>.md` | Qualsiasi pagina in Markdown. Aggiungi `.md` al suo URL, per esempio [`/docs/tools.md`](/docs/tools.md) |

Ogni pagina ha anche un pulsante **Copia come Markdown**, per incollarla in una chat.

Questi file sono in inglese, la lingua di riferimento e quella che i modelli seguono meglio. Ogni traduzione ha anche il suo `llms-full.txt`, per esempio `/fr/llms-full.txt`.

## Indica la documentazione al tuo agente

Incolla questo nelle istruzioni del tuo agente, per esempio in `AGENTS.md` o `CLAUDE.md` nella radice del progetto:

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

## Dai al tuo agente un server di documentazione

La documentazione è disponibile anche come server MCP, [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), costruito con picomcp. Dà agli agenti tre tool, `list_docs`, `search_docs` e `read_doc`, e ogni pagina come risorsa.

In Claude Code:

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

In Cursor, Windsurf, Claude Desktop e nella maggior parte degli altri client, aggiungilo al file di configurazione MCP (`.cursor/mcp.json` per Cursor):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

Il codice sorgente è in [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), circa 100 righe.

## Cosa sbagliano spesso gli agenti

Questi sono gli errori più frequenti dei modelli quando scrivono server MCP, e come funzionano le cose in picomcp:

- **In modalità stdio, stdout è il protocollo.** Un `console.log` lo corromperebbe. picomcp reindirizza l’output della console su stderr quando serve via stdio, ma `process.stdout.write` resta pericoloso.
- **Gli errori dei tool sono risultati, non eccezioni.** Lanciare un errore dentro `run` produce `isError: true` con il tuo messaggio. Il modello lo vede e può riprovare. Non catturare gli errori solo per restituire stringhe `"Error: ..."`.
- **Gli argomenti dei prompt sono stringhe.** Usa `z.coerce.number()` per gli argomenti numerici dei prompt.
- **Il JSON Schema viene dalla libreria di schemi.** Zod 4 e ArkType non hanno bisogno di nulla. Valibot ha bisogno di `toStandardJsonSchema`. Gli altri di `withJsonSchema`.
- **`server.fetch` ignora il percorso.** Instrada tu `/mcp` verso di lui, oppure usa `serve({ http })`, che risponde solo su `/mcp`.
- **Il `server.call` tipizzato richiede la concatenazione.** `pico().tool().tool()` mantiene i tipi. Istruzioni separate li perdono.

## Contribuire con un agente

Il repository contiene un [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) con le regole per lavorare su picomcp stesso: il budget di dimensione, i comandi di test e i vincoli di progettazione.
