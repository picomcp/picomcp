---
title: Introduction
description: Ce qu’est picomcp, ce qu’il n’est pas, et les dix lignes qui l’expliquent.
group: Bien démarrer
---

# Introduction

picomcp est un framework TypeScript pour construire des serveurs [Model Context Protocol](https://modelcontextprotocol.io). Un serveur MCP donne à une application d’IA (Claude, Cursor, VS Code, votre propre agent) des **outils** qu’elle peut appeler, des **ressources** qu’elle peut lire et des **prompts** qu’elle peut proposer à l’utilisateur.

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

C’est un serveur complet. Lancez-le avec `node server.ts` et connectez-le à n’importe quel client MCP.

## Pourquoi picomcp

- **Léger.** Environ 4 kB gzippé, zéro dépendance. La bibliothèque entière tient dans votre tête et dans une revue de code.
- **Typé par votre schéma.** Passez un schéma Zod, Valibot ou ArkType. Votre handler reçoit des arguments typés, le client reçoit un JSON Schema, les appels invalides reçoivent une erreur lisible.
- **Tourne partout.** Node 22+, Bun, Deno, Cloudflare Workers et tout runtime qui dispose de `fetch`. Aucun module intégré de Node dans le cœur.
- **Deux transports, un seul serveur.** stdio pour les clients de bureau, Streamable HTTP pour les serveurs distants. On passe de l’un à l’autre avec une option.
- **Testable sans client.** `server.call("forecast", { city: "Lyon" })` exécute un outil dans le processus, entièrement typé.
- **Vérifié avec le SDK officiel.** La suite de tests pilote picomcp avec `@modelcontextprotocol/sdk` sur les deux transports.

## Ce que picomcp n’est pas

picomcp implémente le côté serveur de MCP, et rien d’autre. Il n’inclut ni client, ni boucle d’agent, ni SDK de LLM. Il privilégie la moitié sans état, en requête/réponse, du protocole : c’est ce dont la plupart des serveurs ont besoin. Les fonctionnalités initiées par le serveur, comme le sampling et l’elicitation, ne sont pas encore prises en charge : voir [Couverture du protocole](/docs/protocol) pour la liste exacte.

## Pour la suite

- [Démarrage rapide](/docs/quickstart) : construire et connecter un serveur en cinq minutes.
- [Outils](/docs/tools) : tout ce qu’un outil sait faire.
- [Pour les agents IA](/docs/agents) : donner la doc à votre agent de code en une URL.
