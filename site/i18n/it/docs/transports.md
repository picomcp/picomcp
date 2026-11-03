---
title: Trasporti
description: stdio per i client locali, Streamable HTTP per quelli remoti, e l’handler fetch che li fa funzionare entrambi.
group: Guide
---

# Trasporti

Un trasporto porta i messaggi JSON-RPC tra il client e il tuo server. picomcp supporta i due definiti da MCP. I tuoi tool non cambiano dall’uno all’altro.

## stdio

```ts
await server.serve();
```

Il client avvia il tuo server come processo figlio e scambia JSON delimitato da a capo su stdin e stdout. È ciò che usano i client desktop e gli agenti di programmazione per i server locali.

stdout appartiene al protocollo. Quando serve via stdio, picomcp reindirizza `console.log`, `console.info` e `console.debug` su stderr: una riga di log fuori posto non può più rompere la connessione. Di solito i client mostrano stderr nei loro log.

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` avvia un server su Bun, Deno o Node, a seconda del runtime in uso. Opzioni:

| Opzione | Predefinito | Descrizione |
| --- | --- | --- |
| `port` | `3000` | Porta in ascolto. `0` ne sceglie una libera. |
| `hostname` | `"127.0.0.1"` | Usa `"0.0.0.0"` per accettare connessioni da altre macchine. |
| `path` | `"/mcp"` | Percorso dell’endpoint. Gli altri percorsi rispondono 404. |

Restituisce `{ url, close() }`.

## L’handler fetch

`server.fetch` è una funzione `(Request) => Promise<Response>` conforme agli standard del Web. Passala a qualsiasi runtime o framework che parli `fetch`:

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` non guarda il percorso: instrada tu le richieste verso di lui. Altre piattaforme in [Deploy](/docs/deploy).

## Come picomcp parla HTTP

picomcp usa Streamable HTTP in modalità JSON senza stato:

- `POST` con un messaggio JSON-RPC o un batch → `200` con una risposta JSON, oppure `202` per le notifiche.
- `GET` e `DELETE` → `405`, che indica ai client che non viene offerto alcun flusso dal server al client.
- `OPTIONS` → preflight CORS per le origini consentite.
- Un header `MCP-Protocol-Version` non supportato → `400`.

Non ci sono sessioni da memorizzare, quindi qualsiasi istanza può rispondere a qualsiasi richiesta. Per questo picomcp si adatta a piattaforme serverless, load balancer e autoscaling senza lavoro in più.

## Origini e DNS rebinding

I browser inviano un header `Origin`. Una pagina malevola potrebbe usarlo per raggiungere un server sulla tua macchina, quindi picomcp lo controlla:

- Le richieste senza `Origin` (CLI, server, app desktop) sono sempre consentite.
- Per impostazione predefinita sono consentite solo le origini `localhost`, `127.0.0.1` e `[::1]`, su qualsiasi porta.
- Le altre origini ricevono `403`.

Consentine altre con l’opzione `origins`:

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## Trasporti personalizzati

`server.handle(message)` elabora un messaggio JSON-RPC, o un batch, e restituisce la risposta. Restituisce `undefined` per le notifiche. Usalo per collegare picomcp a WebSocket, code di messaggi o qualsiasi altra cosa:

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
