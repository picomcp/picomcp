---
title: Tool
description: Definire tool, validare l’input, restituire testo, oggetti o media, segnalare errori e gestire l’annullamento.
group: Guide
---

# Tool

Un tool è una funzione che il modello può chiamare. Registrane uno con `server.tool(name, config)`:

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

## Configurazione

| Opzione | Tipo | Descrizione |
| --- | --- | --- |
| `description` | `string` | Cosa fa il tool e quando usarlo. Il modello legge questo testo. |
| `title` | `string` | Nome mostrato dai client. |
| `input` | Standard Schema | Schema degli argomenti. Omettilo per i tool senza argomenti. |
| `output` | Standard Schema | Schema del risultato strutturato. Vedi [Output strutturato](#output-strutturato). |
| `annotations` | `ToolAnnotations` | Suggerimenti per i client: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | L’handler. Può essere asincrono. |

I nomi dei tool vanno da 1 a 128 caratteri e usano solo lettere, cifre, `_`, `.` e `-`. Registrare un nome non valido o duplicato lancia subito un errore: gli sbagli emergono all’avvio del server, non quando un modello chiama il tool.

## Validazione dell’input

picomcp valida gli argomenti con il tuo schema prima di chiamare `run`. Valori predefiniti e trasformazioni vengono applicati, quindi nell’esempio `limit` dentro `run` è sempre un numero.

Se la validazione fallisce, il tool non viene chiamato. Il client riceve un errore del tool che nomina il campo sbagliato, così il modello può correggere la chiamata e riprovare:

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Valori di ritorno

Restituisci ciò che è naturale. picomcp lo trasforma in un risultato MCP:

| `run` restituisce | Il client riceve |
| --- | --- |
| `string` | Un blocco di testo |
| un oggetto, un array o un numero | Il suo JSON come testo. Gli oggetti vengono inviati anche come `structuredContent`. |
| un blocco di contenuto, o un array di blocchi | Quei blocchi così come sono |
| `{ content: [...] }` | Il risultato così com’è, per il pieno controllo |
| `undefined` | Un risultato vuoto |

Costruisci i blocchi di contenuto con gli helper:

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Output strutturato

Dichiara uno schema `output` quando il risultato è usato da client o da codice, non solo dal modello:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

picomcp allora:

1. annuncia lo schema come `outputSchema` in `tools/list`,
2. controlla con il sistema di tipi il valore restituito da `run`,
3. valida il valore a runtime e lo invia come `structuredContent`, con una copia JSON in testo per i client più vecchi.

Se il valore non corrisponde, il client riceve un errore del tool invece di dati malformati.

## Errori

Lancia un errore da `run`. Il messaggio diventa un errore del tool (`isError: true`) che il modello può leggere e a cui può reagire:

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Scrivi i messaggi di errore per il modello: di’ cosa è andato storto e cosa fare dopo.

Gli errori dei tool fanno parte di una normale conversazione. Gli errori di protocollo no: usa `McpError` solo quando la richiesta stessa è sbagliata, per esempio quando l’utente non ha accesso:

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Annullamento

Il secondo argomento di `run` contiene un `AbortSignal`. Scatta quando il client invia `notifications/cancelled`, di solito perché l’utente ha premuto stop. Passalo a `fetch` e alle altre API che lo accettano:

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

Una volta annullata una richiesta, picomcp non invia alcuna risposta, come richiede il protocollo.

## Metadati

`ctx.meta` contiene l’oggetto `_meta` che il client ha inviato con la richiesta, se presente. I client lo usano per il tracing e per i token di avanzamento.

## Scrivere buoni tool

- **Un compito per tool.** `create_invoice` e `send_invoice` sono meglio di `invoice(action)`.
- **Descrivi gli argomenti.** `.describe()` su ogni campo finisce nel JSON Schema che vede il modello.
- **Restituisci meno.** I modelli pagano ogni token. Restituisci i campi che contano, non l’intera risposta dell’API.
- **Annota con onestà.** `readOnlyHint: true` permette ai client di saltare la conferma. Non metterlo mai su un tool che scrive.
