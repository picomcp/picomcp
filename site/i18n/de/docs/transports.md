---
title: Transporte
description: stdio für lokale Clients, Streamable HTTP für entfernte, und der fetch-Handler, der beides antreibt.
group: Anleitungen
---

# Transporte

Ein Transport überträgt JSON-RPC-Nachrichten zwischen dem Client und deinem Server. picomcp unterstützt die beiden, die MCP definiert. Deine Tools ändern sich dabei nicht.

## stdio

```ts
await server.serve();
```

Der Client startet deinen Server als Kindprozess und tauscht zeilengetrenntes JSON über stdin und stdout aus. So arbeiten Desktop-Clients und Coding-Agenten mit lokalen Servern.

stdout gehört dem Protokoll. Beim Betrieb über stdio leitet picomcp `console.log`, `console.info` und `console.debug` nach stderr um, damit eine verirrte Logzeile die Verbindung nicht kaputt macht. Clients zeigen stderr meist in ihren Logs an.

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` startet einen Server auf Bun, Deno oder Node, je nachdem, was gerade läuft. Optionen:

| Option | Standard | Beschreibung |
| --- | --- | --- |
| `port` | `3000` | Port, auf dem gelauscht wird. `0` wählt einen freien. |
| `hostname` | `"127.0.0.1"` | Mit `"0.0.0.0"` werden Verbindungen von anderen Rechnern angenommen. |
| `path` | `"/mcp"` | Pfad des Endpunkts. Andere Pfade antworten mit 404. |

Es gibt `{ url, close() }` zurück.

## Der fetch-Handler

`server.fetch` ist eine webstandardkonforme Funktion `(Request) => Promise<Response>`. Gib sie jeder Runtime oder jedem Framework, das `fetch` spricht:

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` schaut nicht auf den Pfad. Leite die Anfragen selbst dorthin. Weitere Plattformen unter [Deployment](/docs/deploy).

## Wie picomcp HTTP spricht

picomcp nutzt Streamable HTTP im zustandslosen JSON-Modus:

- `POST` mit einer JSON-RPC-Nachricht oder einem Batch → `200` mit JSON-Antwort, oder `202` bei Benachrichtigungen.
- `GET` und `DELETE` → `405`. Das signalisiert Clients, dass kein Stream vom Server zum Client angeboten wird.
- `OPTIONS` → CORS-Preflight für erlaubte Origins.
- Ein nicht unterstützter `MCP-Protocol-Version`-Header → `400`.

Es gibt keine Sessions zu speichern, also kann jede Instanz jede Anfrage beantworten. Damit passt picomcp ohne Zusatzaufwand zu Serverless-Plattformen, Load Balancern und Autoscaling.

## Origins und DNS-Rebinding

Browser senden einen `Origin`-Header. Eine bösartige Seite könnte darüber einen Server auf deinem Rechner erreichen, deshalb prüft picomcp ihn:

- Anfragen ohne `Origin` (CLIs, Server, Desktop-Apps) sind immer erlaubt.
- Standardmäßig sind nur die Origins `localhost`, `127.0.0.1` und `[::1]` erlaubt, auf jedem Port.
- Andere Origins bekommen `403`.

Weitere erlaubst du mit der Option `origins`:

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## Eigene Transporte

`server.handle(message)` verarbeitet eine JSON-RPC-Nachricht oder einen Batch und gibt die Antwort zurück. Bei Benachrichtigungen gibt es `undefined` zurück. Damit bindest du picomcp an WebSockets, Message Queues oder alles andere an:

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
