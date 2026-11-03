---
title: Prompts
description: Proposer des modèles de prompts réutilisables que l’utilisateur choisit dans le client, avec des arguments validés.
group: Guides
---

# Prompts

Les prompts sont des modèles que l’utilisateur choisit dans le client, souvent sous forme de commandes slash. Ils transforment quelques arguments en un ou plusieurs messages.

```ts
server.prompt("review", {
  title: "Code review",
  description: "Review a diff for bugs and style issues.",
  args: z.object({
    diff: z.string().describe("The diff to review"),
    focus: z.string().optional().describe("What to pay attention to"),
  }),
  run: ({ diff, focus }) => `Review this diff${focus ? `, focusing on ${focus}` : ""}:\n\n${diff}`,
});
```

Le client affiche `diff` comme obligatoire et `focus` comme facultatif, avec leurs descriptions, le tout déduit du schéma.

## Les arguments sont des chaînes

MCP envoie les arguments de prompt sous forme de chaînes. Utilisez des schémas de chaînes, ou convertissez :

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Les arguments invalides sont rejetés avec une erreur `Invalid params` avant l’appel de `run`.

## Valeurs de retour

| `run` renvoie | Messages envoyés |
| --- | --- |
| `string` | Un message utilisateur |
| `PromptMessage[]` | Ces messages |
| `{ description, messages }` | Le résultat complet |

Utilisez un tableau pour les modèles à plusieurs tours ou pour inclure des médias :

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
