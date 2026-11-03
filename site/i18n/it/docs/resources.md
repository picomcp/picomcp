---
title: Risorse
description: Esporre file, record e dati in tempo reale che il client può leggere, con template di URI tipizzati.
group: Guide
---

# Risorse

Le risorse sono dati che il client può leggere e allegare a una conversazione: file, righe di database, risposte di API. I tool li chiama il modello; le risorse di solito le sceglie l’utente o l’applicazione.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## Template di URI

Inserisci `{variables}` nell’URI per servire un’intera famiglia di risorse. Le variabili sono tipizzate a partire dalla stringa stessa:

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

| Sintassi | Corrisponde a | Esempio |
| --- | --- | --- |
| `{name}` | Un segmento di percorso, senza `/`, `?` o `#` | `users://{id}` corrisponde a `users://42` |
| `{+name}` | Qualsiasi cosa, `/` compreso | `files://{+path}` corrisponde a `files://src/index.ts` |

I valori vengono decodificati (URL) prima di arrivare a `read`. Le risorse statiche compaiono in `resources/list`, i template in `resources/templates/list`.

## Valori di ritorno

| `read` restituisce | Contenuto inviato |
| --- | --- |
| `string` | Testo, con `mimeType` o `text/plain` |
| `Uint8Array` | Blob in base64, con `mimeType` o `application/octet-stream` |
| un array di `{ uri, text }` o `{ uri, blob }` | Quei contenuti così come sono |
| qualsiasi altro valore | Il suo JSON, come `application/json` |

`read` riceve il contesto come secondo argomento, con in più l’`uri` richiesto:

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Opzioni

| Opzione | Descrizione |
| --- | --- |
| `name` | Identificativo mostrato agli utenti. Predefinito: l’URI. |
| `title` | Nome visualizzato. |
| `description` | Cosa contiene la risorsa. |
| `mimeType` | Tipo di contenuto di ciò che restituisce `read`. |
| `annotations` | Suggerimenti `audience`, `priority` e `lastModified`. |

## Non trovata

Quando nessuna risorsa corrisponde a un URI, picomcp risponde con l’errore di protocollo `-32002 Resource not found`. Per rifiutare un URI che corrisponde a un template ma non punta a niente, lancia una `McpError` con lo stesso codice:

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Collegare dai tool

Un tool può indicare al modello una risorsa invece di includerla, così i dati voluminosi restano fuori dal contesto finché non servono:

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
