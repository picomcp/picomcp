---
title: Para agentes de IA
description: Documentación legible por máquinas, llms.txt, páginas Markdown y reglas para tu agente de código.
group: Para agentes de IA
---

# Para agentes de IA

Los agentes de código escriben muchos servidores MCP. Esta documentación está pensada para que la lean ellos tanto como tú.

## Documentación legible por máquinas

| URL | Contenido |
| --- | --- |
| [`/llms.txt`](/llms.txt) | Índice de todas las páginas con un resumen de una línea, en formato [llms.txt](https://llmstxt.org) |
| [`/llms-full.txt`](/llms-full.txt) | Toda la documentación en un solo archivo Markdown |
| `/docs/<page>.md` | Cualquier página en Markdown. Añade `.md` a su URL, por ejemplo [`/docs/tools.md`](/docs/tools.md) |

Cada página tiene además un botón **Copiar como Markdown**, para pegarla en un chat.

Estos archivos están en inglés, el idioma de referencia y el que mejor siguen los modelos. Cada traducción tiene también su propio `llms-full.txt`, por ejemplo `/fr/llms-full.txt`.

## Indica la documentación a tu agente

Pega esto en las instrucciones de tu agente, por ejemplo en `AGENTS.md` o `CLAUDE.md` en la raíz de tu proyecto:

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

## Dale a tu agente un servidor de documentación

La documentación también está disponible como servidor MCP, [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), construido con picomcp. Da a los agentes tres herramientas, `list_docs`, `search_docs` y `read_doc`, y cada página como recurso.

En Claude Code:

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

En Cursor, Windsurf, Claude Desktop y la mayoría de los demás clientes, añádelo al archivo de configuración MCP (`.cursor/mcp.json` en Cursor):

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

El código fuente está en [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), unas 100 líneas.

## Lo que los agentes suelen hacer mal

Estos son los errores que más cometen los modelos al escribir servidores MCP, y cómo funcionan las cosas en picomcp:

- **En modo stdio, stdout es el protocolo.** Un `console.log` lo corrompería. picomcp redirige la salida de la consola a stderr mientras sirve por stdio, pero `process.stdout.write` sigue siendo peligroso.
- **Los errores de herramienta son resultados, no excepciones.** Lanzar un error dentro de `run` produce `isError: true` con tu mensaje. El modelo lo ve y puede reintentar. No captures errores solo para devolver cadenas `"Error: ..."`.
- **Los argumentos de los prompts son cadenas.** Usa `z.coerce.number()` para argumentos numéricos de prompts.
- **El JSON Schema sale de la librería de esquemas.** Zod 4 y ArkType no necesitan nada. Valibot necesita `toStandardJsonSchema`. Los demás, `withJsonSchema`.
- **`server.fetch` ignora la ruta.** Dirige tú `/mcp` hacia él, o usa `serve({ http })`, que solo responde en `/mcp`.
- **El `server.call` tipado requiere encadenar.** `pico().tool().tool()` conserva los tipos. Las sentencias separadas los pierden.

## Contribuir con un agente

El repositorio tiene un [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) con las reglas para trabajar en picomcp: el presupuesto de tamaño, los comandos de test y las restricciones de diseño.
