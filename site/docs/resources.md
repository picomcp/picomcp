---
title: Resources
description: Expose files, records and live data the client can read, with typed URI templates.
group: Guides
---

# Resources

Resources are data the client can read and attach to a conversation: files, database rows, API responses. Tools are called by the model; resources are usually picked by the user or the application.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## URI templates

Put `{variables}` in the URI to serve a family of resources. The variables are typed from the string itself:

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

| Syntax | Matches | Example |
| --- | --- | --- |
| `{name}` | One path segment, no `/`, `?` or `#` | `users://{id}` matches `users://42` |
| `{+name}` | Anything, including `/` | `files://{+path}` matches `files://src/index.ts` |

Values are URL-decoded before they reach `read`. Static resources appear in `resources/list`, templates in `resources/templates/list`.

## Return values

| `read` returns | Contents sent |
| --- | --- |
| `string` | Text, with `mimeType` or `text/plain` |
| `Uint8Array` | Base64 blob, with `mimeType` or `application/octet-stream` |
| an array of `{ uri, text }` or `{ uri, blob }` | Those contents as they are |
| any other value | Its JSON, as `application/json` |

`read` receives the context as its second argument, with the requested `uri` added:

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Options

| Option | Description |
| --- | --- |
| `name` | Identifier shown to users. Defaults to the URI. |
| `title` | Display name. |
| `description` | What the resource contains. |
| `mimeType` | Content type of what `read` returns. |
| `annotations` | `audience`, `priority` and `lastModified` hints. |

## Not found

When no resource matches a URI, picomcp answers with the protocol's `-32002 Resource not found` error. To reject a URI that matches a template but points at nothing, throw an `McpError` with the same code:

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Linking from tools

A tool can point the model at a resource instead of inlining it, which keeps large data out of the context until it is needed:

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
