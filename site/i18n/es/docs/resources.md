---
title: Recursos
description: Exponer archivos, registros y datos en vivo que el cliente puede leer, con plantillas de URI tipadas.
group: Guías
---

# Recursos

Los recursos son datos que el cliente puede leer y adjuntar a una conversación: archivos, filas de base de datos, respuestas de API. Las herramientas las llama el modelo; los recursos suele elegirlos el usuario o la aplicación.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## Plantillas de URI

Pon `{variables}` en la URI para servir toda una familia de recursos. Las variables se tipan a partir de la propia cadena:

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: async ({ owner, repo }) => {
    //           ^? { owner: string; repo: string }
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`);
    return res.text();
  },
});
```

| Sintaxis | Coincide con | Ejemplo |
| --- | --- | --- |
| `{name}` | Un segmento de ruta, sin `/`, `?` ni `#` | `users://{id}` coincide con `users://42` |
| `{+name}` | Cualquier cosa, incluido `/` | `files://{+path}` coincide con `files://src/index.ts` |

Los valores se decodifican (URL) antes de llegar a `read`. Los recursos estáticos aparecen en `resources/list` y las plantillas en `resources/templates/list`.

## Valores de retorno

| `read` devuelve | Contenido enviado |
| --- | --- |
| `string` | Texto, con `mimeType` o `text/plain` |
| `Uint8Array` | Blob en base64, con `mimeType` o `application/octet-stream` |
| un array de `{ uri, text }` o `{ uri, blob }` | Esos contenidos tal cual |
| cualquier otro valor | Su JSON, como `application/json` |

`read` recibe el contexto como segundo argumento, con la `uri` solicitada añadida:

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Opciones

| Opción | Descripción |
| --- | --- |
| `name` | Identificador que se muestra a los usuarios. Por defecto, la URI. |
| `title` | Nombre visible. |
| `description` | Qué contiene el recurso. |
| `mimeType` | Tipo de contenido de lo que devuelve `read`. |
| `annotations` | Pistas `audience`, `priority` y `lastModified`. |

## No encontrado

Cuando ningún recurso coincide con una URI, picomcp responde con el error de protocolo `-32002 Resource not found`. Para rechazar una URI que coincide con una plantilla pero no apunta a nada, lanza un `McpError` con el mismo código:

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Enlazar desde herramientas

Una herramienta puede señalar un recurso al modelo en lugar de incluirlo, lo que deja los datos grandes fuera del contexto hasta que hagan falta:

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
