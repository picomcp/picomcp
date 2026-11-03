---
title: Herramientas
description: Definir herramientas, validar la entrada, devolver texto, objetos o medios, informar de errores y gestionar la cancelación.
group: Guías
---

# Herramientas

Una herramienta es una función que el modelo puede llamar. Registra una con `server.tool(name, config)`:

```ts
server.tool("search_issues", {
  title: "Search issues",
  description: "Search open GitHub issues in a repository. Use it before filing a new issue.",
  input: z.object({
    repo: z.string().describe("owner/name"),
    query: z.string(),
    limit: z.number().int().max(50).default(10),
  }),
  annotations: { readOnlyHint: true, openWorldHint: true },
  run: async ({ repo, query, limit }, { signal }) => {
    const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} repo:${repo}`)}&per_page=${limit}`, { signal });
    const { items } = await res.json();
    return items.map((i: { title: string; html_url: string }) => `${i.title} — ${i.html_url}`).join("\n");
  },
});
```

## Configuración

| Opción | Tipo | Descripción |
| --- | --- | --- |
| `description` | `string` | Qué hace la herramienta y cuándo usarla. El modelo lee este texto. |
| `title` | `string` | Nombre que muestran los clientes. |
| `input` | Standard Schema | Esquema de los argumentos. Omítelo en herramientas sin argumentos. |
| `output` | Standard Schema | Esquema del resultado estructurado. Ver [Salida estructurada](#salida-estructurada). |
| `annotations` | `ToolAnnotations` | Pistas para los clientes: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | El handler. Puede ser asíncrono. |

Los nombres de herramienta tienen de 1 a 128 caracteres y solo usan letras, dígitos, `_`, `.` y `-`. Registrar un nombre inválido o repetido lanza un error enseguida, así que los fallos aparecen al arrancar el servidor y no cuando un modelo llama a la herramienta.

## Validación de la entrada

picomcp valida los argumentos con tu esquema antes de llamar a `run`. Se aplican valores por defecto y transformaciones, así que en el ejemplo `limit` siempre es un número dentro de `run`.

Si la validación falla, no se llama a la herramienta. El cliente recibe un error de herramienta que nombra el campo incorrecto, para que el modelo corrija su llamada y vuelva a intentarlo:

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Valores de retorno

Devuelve lo que te resulte natural. picomcp lo convierte en un resultado MCP:

| `run` devuelve | El cliente recibe |
| --- | --- |
| `string` | Un bloque de texto |
| un objeto, un array o un número | Su JSON como texto. Los objetos también se envían como `structuredContent`. |
| un bloque de contenido, o un array de bloques | Esos bloques tal cual |
| `{ content: [...] }` | El resultado tal cual, para tener control total |
| `undefined` | Un resultado vacío |

Construye bloques de contenido con los helpers:

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Salida estructurada

Declara un esquema `output` cuando el resultado lo consumen clientes o código, no solo el modelo:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

Entonces picomcp:

1. anuncia el esquema como `outputSchema` en `tools/list`,
2. comprueba con los tipos el valor que devuelve `run`,
3. valida el valor en tiempo de ejecución y lo envía como `structuredContent`, con una copia en texto JSON para clientes antiguos.

Si el valor no encaja, el cliente recibe un error de herramienta en lugar de datos mal formados.

## Errores

Lanza un error desde `run`. El mensaje se convierte en un error de herramienta (`isError: true`) que el modelo puede leer y al que puede reaccionar:

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Escribe los mensajes de error para el modelo: di qué ha fallado y qué hacer a continuación.

Los errores de herramienta forman parte de una conversación normal. Los errores de protocolo no: usa `McpError` solo cuando la petición en sí es incorrecta, por ejemplo cuando el usuario no tiene acceso:

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Cancelación

El segundo argumento de `run` lleva un `AbortSignal`. Se activa cuando el cliente envía `notifications/cancelled`, normalmente porque el usuario ha pulsado detener. Pásalo a `fetch` y a otras API que lo acepten:

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

Una vez cancelada una petición, picomcp no envía respuesta para ella, como exige el protocolo.

## Metadatos

`ctx.meta` contiene el objeto `_meta` que el cliente envió con la petición, si lo hay. Los clientes lo usan para trazas y tokens de progreso.

## Escribir buenas herramientas

- **Una tarea por herramienta.** `create_invoice` y `send_invoice` son mejores que `invoice(action)`.
- **Describe los argumentos.** `.describe()` en cada campo acaba en el JSON Schema que ve el modelo.
- **Devuelve menos.** Los modelos pagan cada token. Devuelve los campos que importan, no toda la respuesta de la API.
- **Anota con honestidad.** `readOnlyHint: true` permite a los clientes saltarse la confirmación. Nunca lo pongas en una herramienta que escribe.
