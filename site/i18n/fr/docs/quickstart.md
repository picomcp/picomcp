---
title: Démarrage rapide
description: Générer, tester et connecter votre premier serveur MCP en cinq minutes.
group: Bien démarrer
---

# Démarrage rapide

Il vous faut Node 22.18 ou plus récent (il exécute directement les fichiers TypeScript), Bun ou Deno.

## Générer un projet

```sh
npx picomcp init my-server
cd my-server
npm install
```

Vous obtenez un serveur prêt à tourner :

| Fichier | Rôle |
| --- | --- |
| `server.ts` | La définition de votre serveur : outils, ressources, prompts |
| `main.ts` | Démarre le serveur en stdio |
| `server.test.ts` | Un test qui appelle un outil dans le processus |

Vous préférez partir de zéro ? Installez les deux paquets et écrivez `server.ts` vous-même :

```sh
npm install picomcp zod
```

## Écrire un outil

Ouvrez `server.ts` :

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` est ce que le modèle lit pour décider quand appeler l’outil. Écrivez-la pour le modèle.
- `input` accepte n’importe quel [Standard Schema](/docs/schemas). Dans `run`, `name` est typé `string`.
- Ici, `run` renvoie une chaîne. Il peut aussi renvoyer des objets, des blocs de contenu, ou lever une erreur : voir [Outils](/docs/tools).

## Le tester

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` est vérifié au typage : une faute dans le nom de l’outil ou un argument manquant ne compile pas.

## Le connecter

Pour Claude Code :

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Demandez ensuite à Claude de saluer quelqu’un. Pour Claude Desktop, Cursor, VS Code et les autres, voir [Connecter un client](/docs/clients).

## L’inspecter

MCP Inspector permet d’appeler les outils à la main et de voir les messages bruts :

```sh
npx @modelcontextprotocol/inspector node main.ts
```
