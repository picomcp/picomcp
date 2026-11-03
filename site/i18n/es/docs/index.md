---
title: Introducción
description: Qué es picomcp, qué no es, y las diez líneas que lo explican.
group: Primeros pasos
---

# Introducción

picomcp es un framework de TypeScript para construir servidores [Model Context Protocol](https://modelcontextprotocol.io). Un servidor MCP le da a una aplicación de IA (Claude, Cursor, VS Code, tu propio agente) **herramientas** que puede llamar, **recursos** que puede leer y **prompts** que puede ofrecer al usuario.

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

Eso es un servidor completo. Ejecútalo con `node server.ts` y conéctalo a cualquier cliente MCP.

## Por qué picomcp

- **Pequeño.** Unos 4 kB con gzip, cero dependencias. La librería entera cabe en tu cabeza y en una revisión de código.
- **Tipado desde tu esquema.** Pasa un esquema de Zod, Valibot o ArkType. Tu handler recibe argumentos tipados, el cliente recibe un JSON Schema y las llamadas inválidas reciben un error legible.
- **Funciona en todas partes.** Node 22+, Bun, Deno, Cloudflare Workers y cualquier runtime con `fetch`. Ningún módulo integrado de Node en el núcleo.
- **Dos transportes, un solo servidor.** stdio para clientes de escritorio, Streamable HTTP para servidores remotos. Se cambia con una opción.
- **Se prueba sin cliente.** `server.call("forecast", { city: "Lyon" })` ejecuta una herramienta en el mismo proceso, totalmente tipada.
- **Verificado con el SDK oficial.** La suite de tests controla picomcp con `@modelcontextprotocol/sdk` en ambos transportes.

## Qué no es picomcp

picomcp implementa el lado servidor de MCP y nada más. No incluye cliente, ni bucle de agente, ni SDK de LLM. Se centra en la mitad sin estado, de petición y respuesta, del protocolo, que es lo que necesitan la mayoría de los servidores. Las funciones iniciadas por el servidor, como sampling y elicitation, aún no están soportadas: la lista exacta está en [Cobertura del protocolo](/docs/protocol).

## Siguientes pasos

- [Inicio rápido](/docs/quickstart): construye y conecta un servidor en cinco minutos.
- [Herramientas](/docs/tools): todo lo que puede hacer una herramienta.
- [Para agentes de IA](/docs/agents): dale la documentación a tu agente de código con una sola URL.
