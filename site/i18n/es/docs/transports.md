---
title: Transportes
description: stdio para clientes locales, Streamable HTTP para remotos, y el handler fetch que mueve ambos.
group: Guías
---

# Transportes

Un transporte lleva los mensajes JSON-RPC entre el cliente y tu servidor. picomcp soporta los dos que define MCP. Tus herramientas no cambian de uno a otro.

## stdio

```ts
await server.serve();
```

El cliente arranca tu servidor como proceso hijo e intercambia JSON delimitado por saltos de línea por stdin y stdout. Es lo que usan los clientes de escritorio y los agentes de código para servidores locales.

stdout pertenece al protocolo. Mientras sirve por stdio, picomcp redirige `console.log`, `console.info` y `console.debug` a stderr, para que una línea de log perdida no rompa la conexión. Los clientes suelen mostrar stderr en sus logs.

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` arranca un servidor en Bun, Deno o Node, el que esté en uso. Opciones:

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `port` | `3000` | Puerto de escucha. `0` elige uno libre. |
| `hostname` | `"127.0.0.1"` | Usa `"0.0.0.0"` para aceptar conexiones desde otras máquinas. |
| `path` | `"/mcp"` | Ruta del endpoint. Las demás rutas responden 404. |

Devuelve `{ url, close() }`.

## El handler fetch

`server.fetch` es una función `(Request) => Promise<Response>` que sigue los estándares web. Pásala a cualquier runtime o framework que hable `fetch`:

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` no mira la ruta: dirige tú las peticiones hacia él. Más plataformas en [Despliegue](/docs/deploy).

## Cómo habla picomcp HTTP

picomcp usa Streamable HTTP en modo JSON sin estado:

- `POST` con un mensaje JSON-RPC o un lote → `200` con una respuesta JSON, o `202` para notificaciones.
- `GET` y `DELETE` → `405`, que indica a los clientes que no se ofrece un flujo del servidor al cliente.
- `OPTIONS` → preflight CORS para los orígenes permitidos.
- Una cabecera `MCP-Protocol-Version` no soportada → `400`.

No hay sesiones que guardar, así que cualquier instancia puede responder a cualquier petición. Por eso picomcp encaja en plataformas serverless, balanceadores de carga y autoescalado sin trabajo extra.

## Orígenes y DNS rebinding

Los navegadores envían una cabecera `Origin`. Una página maliciosa podría usarla para llegar a un servidor en tu máquina, así que picomcp la comprueba:

- Las peticiones sin `Origin` (CLI, servidores, aplicaciones de escritorio) siempre se permiten.
- Por defecto solo se permiten los orígenes `localhost`, `127.0.0.1` y `[::1]`, en cualquier puerto.
- Los demás orígenes reciben `403`.

Permite otros con la opción `origins`:

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## Transportes personalizados

`server.handle(message)` procesa un mensaje JSON-RPC, o un lote, y devuelve la respuesta. Devuelve `undefined` para las notificaciones. Úsalo para conectar picomcp a WebSockets, colas de mensajes o cualquier otra cosa:

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
