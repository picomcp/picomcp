---
title: Inicio rápido
description: Crea, prueba y conecta tu primer servidor MCP en cinco minutos.
group: Primeros pasos
---

# Inicio rápido

Necesitas Node 22.18 o posterior (ejecuta archivos TypeScript directamente), Bun o Deno.

## Crear un proyecto

```sh
npx picomcp init my-server
cd my-server
npm install
```

Obtienes un servidor listo para funcionar:

| Archivo | Para qué sirve |
| --- | --- |
| `server.ts` | La definición de tu servidor: herramientas, recursos, prompts |
| `main.ts` | Arranca el servidor por stdio |
| `server.test.ts` | Un test que llama a una herramienta en el mismo proceso |

¿Prefieres empezar desde cero? Instala los dos paquetes y escribe `server.ts` tú mismo:

```sh
npm install picomcp zod
```

## Escribir una herramienta

Abre `server.ts`:

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` es lo que lee el modelo para decidir cuándo llamar a la herramienta. Escríbela para el modelo.
- `input` es cualquier [Standard Schema](/docs/schemas). Dentro de `run`, `name` es de tipo `string`.
- Aquí `run` devuelve una cadena. También puede devolver objetos, bloques de contenido o lanzar un error: ver [Herramientas](/docs/tools).

## Probarla

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` se comprueba con los tipos: una errata en el nombre de la herramienta o un argumento que falta no compila.

## Conectarla

Para Claude Code:

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Después pídele a Claude que salude a alguien. Para Claude Desktop, Cursor, VS Code y otros, ver [Conectar un cliente](/docs/clients).

## Inspeccionarla

MCP Inspector te permite llamar a las herramientas a mano y ver los mensajes en bruto:

```sh
npx @modelcontextprotocol/inspector node main.ts
```
