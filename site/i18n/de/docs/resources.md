---
title: Ressourcen
description: Dateien, Datensätze und Live-Daten bereitstellen, die der Client lesen kann, mit typisierten URI-Templates.
group: Anleitungen
---

# Ressourcen

Ressourcen sind Daten, die der Client lesen und einem Gespräch hinzufügen kann: Dateien, Datenbankzeilen, API-Antworten. Tools ruft das Modell auf; Ressourcen wählt meist der Nutzer oder die Anwendung aus.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## URI-Templates

Setz `{variables}` in die URI, um eine ganze Familie von Ressourcen bereitzustellen. Die Variablen werden aus dem String selbst typisiert:

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

| Syntax | Passt auf | Beispiel |
| --- | --- | --- |
| `{name}` | Ein Pfadsegment, ohne `/`, `?` oder `#` | `users://{id}` passt auf `users://42` |
| `{+name}` | Alles, auch `/` | `files://{+path}` passt auf `files://src/index.ts` |

Die Werte werden URL-dekodiert, bevor sie `read` erreichen. Statische Ressourcen erscheinen in `resources/list`, Templates in `resources/templates/list`.

## Rückgabewerte

| `read` gibt zurück | Gesendeter Inhalt |
| --- | --- |
| `string` | Text, mit `mimeType` oder `text/plain` |
| `Uint8Array` | Base64-Blob, mit `mimeType` oder `application/octet-stream` |
| ein Array von `{ uri, text }` oder `{ uri, blob }` | Diese Inhalte unverändert |
| jeder andere Wert | Sein JSON, als `application/json` |

`read` bekommt den Kontext als zweites Argument, ergänzt um die angefragte `uri`:

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Optionen

| Option | Beschreibung |
| --- | --- |
| `name` | Kennung, die Nutzern angezeigt wird. Standard ist die URI. |
| `title` | Anzeigename. |
| `description` | Was die Ressource enthält. |
| `mimeType` | Inhaltstyp dessen, was `read` zurückgibt. |
| `annotations` | Hinweise zu `audience`, `priority` und `lastModified`. |

## Nicht gefunden

Passt keine Ressource auf eine URI, antwortet picomcp mit dem Protokollfehler `-32002 Resource not found`. Um eine URI abzulehnen, die zwar auf ein Template passt, aber auf nichts zeigt, wirf eine `McpError` mit demselben Code:

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Aus Tools verlinken

Ein Tool kann das Modell auf eine Ressource verweisen, statt sie einzubetten. So bleiben große Daten aus dem Kontext, bis sie gebraucht werden:

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
