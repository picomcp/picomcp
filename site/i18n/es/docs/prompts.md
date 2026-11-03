---
title: Prompts
description: Ofrecer plantillas de prompts reutilizables que el usuario elige en el cliente, con argumentos validados.
group: Guías
---

# Prompts

Los prompts son plantillas que el usuario elige en el cliente, a menudo como comandos con barra. Convierten unos pocos argumentos en uno o varios mensajes.

```ts
server.prompt("review", {
  title: "Code review",
  description: "Review a diff for bugs and style issues.",
  args: z.object({
    diff: z.string().describe("The diff to review"),
    focus: z.string().optional().describe("What to pay attention to"),
  }),
  run: ({ diff, focus }) => `Review this diff${focus ? `, focusing on ${focus}` : ""}:\n\n${diff}`,
});
```

El cliente muestra `diff` como obligatorio y `focus` como opcional, con sus descripciones, todo deducido del esquema.

## Los argumentos son cadenas

MCP envía los argumentos de los prompts como cadenas. Usa esquemas de cadena, o convierte:

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Los argumentos inválidos se rechazan con un error `Invalid params` antes de llamar a `run`.

## Valores de retorno

| `run` devuelve | Mensajes enviados |
| --- | --- |
| `string` | Un mensaje de usuario |
| `PromptMessage[]` | Esos mensajes |
| `{ description, messages }` | El resultado completo |

Usa un array para plantillas de varios turnos o para incluir medios:

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
