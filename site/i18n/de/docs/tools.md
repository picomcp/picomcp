---
title: Tools
description: Tools definieren, Eingaben validieren, Text, Objekte oder Medien zurückgeben, Fehler melden und Abbrüche behandeln.
group: Anleitungen
---

# Tools

Ein Tool ist eine Funktion, die das Modell aufrufen kann. Registriere eines mit `server.tool(name, config)`:

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

## Konfiguration

| Option | Typ | Beschreibung |
| --- | --- | --- |
| `description` | `string` | Was das Tool tut und wann man es nutzt. Das Modell liest diesen Text. |
| `title` | `string` | Anzeigename für Clients. |
| `input` | Standard Schema | Schema der Argumente. Lass es bei Tools ohne Argumente weg. |
| `output` | Standard Schema | Schema des strukturierten Ergebnisses. Siehe [Strukturierte Ausgabe](#strukturierte-ausgabe). |
| `annotations` | `ToolAnnotations` | Hinweise für Clients: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | Der Handler. Er darf asynchron sein. |

Tool-Namen sind 1 bis 128 Zeichen lang und bestehen nur aus Buchstaben, Ziffern, `_`, `.` und `-`. Ein ungültiger oder doppelter Name wirft sofort einen Fehler, sodass Fehler beim Serverstart auffallen und nicht erst, wenn ein Modell das Tool aufruft.

## Eingabevalidierung

picomcp validiert die Argumente mit deinem Schema, bevor `run` aufgerufen wird. Standardwerte und Transformationen greifen, daher ist `limit` im Beispiel in `run` immer eine Zahl.

Schlägt die Validierung fehl, wird das Tool nicht aufgerufen. Der Client bekommt einen Tool-Fehler, der das fehlerhafte Feld nennt, damit das Modell seinen Aufruf korrigieren und erneut versuchen kann:

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Rückgabewerte

Gib zurück, was naheliegt. picomcp macht daraus ein MCP-Ergebnis:

| `run` gibt zurück | Der Client erhält |
| --- | --- |
| `string` | Einen Textblock |
| ein Objekt, ein Array oder eine Zahl | Sein JSON als Text. Objekte gehen zusätzlich als `structuredContent` raus. |
| einen Inhaltsblock oder ein Array davon | Diese Blöcke unverändert |
| `{ content: [...] }` | Das Ergebnis unverändert, für volle Kontrolle |
| `undefined` | Ein leeres Ergebnis |

Inhaltsblöcke baust du mit den Helfern:

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Strukturierte Ausgabe

Deklariere ein `output`-Schema, wenn Clients oder Code das Ergebnis verarbeiten, nicht nur das Modell:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

picomcp dann:

1. kündigt das Schema in `tools/list` als `outputSchema` an,
2. prüft den Rückgabewert von `run` im Typsystem dagegen,
3. validiert den Wert zur Laufzeit und sendet ihn als `structuredContent`, mit einer JSON-Textkopie für ältere Clients.

Passt der Wert nicht, bekommt der Client einen Tool-Fehler statt fehlerhafter Daten.

## Fehler

Wirf in `run` einen Fehler. Die Fehlermeldung wird zu einem Tool-Fehler (`isError: true`), den das Modell lesen und auf den es reagieren kann:

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Schreib Fehlermeldungen für das Modell: Sag, was schiefging und was als Nächstes zu tun ist.

Tool-Fehler gehören zu einem normalen Gespräch. Protokollfehler nicht: Verwende `McpError` nur, wenn die Anfrage selbst falsch ist, etwa wenn dem Nutzer der Zugriff fehlt:

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Abbruch

Das zweite Argument von `run` enthält ein `AbortSignal`. Es wird ausgelöst, wenn der Client `notifications/cancelled` sendet, meist weil der Nutzer auf Stopp gedrückt hat. Gib es an `fetch` und andere APIs weiter, die es annehmen:

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

Sobald eine Anfrage abgebrochen ist, sendet picomcp dafür keine Antwort, wie es das Protokoll verlangt.

## Metadaten

`ctx.meta` enthält das `_meta`-Objekt, das der Client mit der Anfrage gesendet hat, falls vorhanden. Clients nutzen es für Tracing und Fortschritts-Tokens.

## Gute Tools schreiben

- **Eine Aufgabe pro Tool.** `create_invoice` und `send_invoice` sind besser als `invoice(action)`.
- **Beschreibe die Argumente.** `.describe()` an jedem Feld landet im JSON Schema, das das Modell sieht.
- **Gib weniger zurück.** Modelle bezahlen jedes Token. Gib die wichtigen Felder zurück, nicht die ganze API-Antwort.
- **Annotiere ehrlich.** Mit `readOnlyHint: true` können Clients Bestätigungsdialoge überspringen. Setz es nie bei einem Tool, das schreibt.
