---
title: Transports
description: stdio pour les clients locaux, Streamable HTTP pour les clients distants, et le handler fetch qui fait tourner les deux.
group: Guides
---

# Transports

Un transport achemine les messages JSON-RPC entre le client et votre serveur. picomcp prend en charge les deux que définit MCP. Vos outils ne changent pas de l’un à l’autre.

## stdio

```ts
await server.serve();
```

Le client lance votre serveur comme processus enfant et échange du JSON délimité par des retours à la ligne sur stdin et stdout. C’est ce qu’utilisent les clients de bureau et les agents de code pour les serveurs locaux.

stdout appartient au protocole. Quand il sert en stdio, picomcp redirige `console.log`, `console.info` et `console.debug` vers stderr : une ligne de log égarée ne peut plus casser la connexion. Les clients affichent en général stderr dans leurs logs.

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` démarre un serveur sur Bun, Deno ou Node, selon le runtime en cours. Options :

| Option | Défaut | Description |
| --- | --- | --- |
| `port` | `3000` | Port d’écoute. `0` en choisit un libre. |
| `hostname` | `"127.0.0.1"` | Utilisez `"0.0.0.0"` pour accepter les connexions d’autres machines. |
| `path` | `"/mcp"` | Chemin de l’endpoint. Les autres chemins répondent 404. |

Il renvoie `{ url, close() }`.

## Le handler fetch

`server.fetch` est une fonction `(Request) => Promise<Response>` conforme aux standards du Web. Confiez-la à n’importe quel runtime ou framework qui parle `fetch` :

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` ne regarde pas le chemin : routez les requêtes vers lui vous-même. D’autres plateformes dans [Déployer](/docs/deploy).

## Comment picomcp parle HTTP

picomcp utilise Streamable HTTP en mode JSON sans état :

- `POST` avec un message JSON-RPC ou un lot → `200` avec une réponse JSON, ou `202` pour les notifications.
- `GET` et `DELETE` → `405`, ce qui indique aux clients qu’aucun flux du serveur vers le client n’est proposé.
- `OPTIONS` → preflight CORS pour les origines autorisées.
- Un en-tête `MCP-Protocol-Version` non pris en charge → `400`.

Il n’y a pas de session à stocker : n’importe quelle instance peut répondre à n’importe quelle requête. picomcp se prête donc aux plateformes serverless, aux load balancers et à l’autoscaling sans travail supplémentaire.

## Origines et DNS rebinding

Les navigateurs envoient un en-tête `Origin`. Une page malveillante pourrait s’en servir pour atteindre un serveur sur votre machine, alors picomcp le vérifie :

- Les requêtes sans `Origin` (CLI, serveurs, applications de bureau) sont toujours acceptées.
- Par défaut, seules les origines `localhost`, `127.0.0.1` et `[::1]` sont acceptées, sur n’importe quel port.
- Les autres origines reçoivent `403`.

Autorisez-en d’autres avec l’option `origins` :

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## Transports personnalisés

`server.handle(message)` traite un message JSON-RPC, ou un lot, et renvoie la réponse. Il renvoie `undefined` pour les notifications. Utilisez-le pour brancher picomcp sur des WebSockets, des files de messages ou autre chose :

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
