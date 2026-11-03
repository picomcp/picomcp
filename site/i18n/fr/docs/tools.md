---
title: Outils
description: Définir des outils, valider l’entrée, renvoyer du texte, des objets ou des médias, signaler les erreurs et gérer l’annulation.
group: Guides
---

# Outils

Un outil est une fonction que le modèle peut appeler. Enregistrez-en un avec `server.tool(name, config)` :

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

## Configuration

| Option | Type | Description |
| --- | --- | --- |
| `description` | `string` | Ce que fait l’outil et quand l’utiliser. Le modèle lit ce texte. |
| `title` | `string` | Nom affiché par les clients. |
| `input` | Standard Schema | Schéma des arguments. Omettez-le pour les outils sans argument. |
| `output` | Standard Schema | Schéma du résultat structuré. Voir [Sortie structurée](#sortie-structurée). |
| `annotations` | `ToolAnnotations` | Indications pour les clients : `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | Le handler. Il peut être asynchrone. |

Les noms d’outils font de 1 à 128 caractères et n’utilisent que des lettres, des chiffres, `_`, `.` et `-`. Enregistrer un nom invalide ou déjà pris lève une erreur immédiatement : les erreurs apparaissent au démarrage du serveur, pas quand un modèle appelle l’outil.

## Validation de l’entrée

picomcp valide les arguments avec votre schéma avant d’appeler `run`. Les valeurs par défaut et les transformations s’appliquent : dans l’exemple, `limit` est toujours un nombre dans `run`.

Si la validation échoue, l’outil n’est pas appelé. Le client reçoit une erreur d’outil qui nomme le champ fautif, pour que le modèle corrige son appel et réessaie :

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Valeurs de retour

Renvoyez ce qui est naturel. picomcp le transforme en résultat MCP :

| `run` renvoie | Le client reçoit |
| --- | --- |
| `string` | Un bloc de texte |
| un objet, un tableau ou un nombre | Son JSON en texte. Les objets sont aussi envoyés en `structuredContent`. |
| un bloc de contenu, ou un tableau de blocs | Ces blocs, tels quels |
| `{ content: [...] }` | Le résultat tel quel, pour tout contrôler |
| `undefined` | Un résultat vide |

Construisez des blocs de contenu avec les helpers :

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Sortie structurée

Déclarez un schéma `output` quand le résultat est consommé par des clients ou du code, et pas seulement par le modèle :

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

picomcp alors :

1. annonce le schéma comme `outputSchema` dans `tools/list` ;
2. vérifie au typage la valeur renvoyée par `run` ;
3. valide la valeur à l’exécution et l’envoie en `structuredContent`, avec une copie JSON en texte pour les anciens clients.

Si la valeur ne correspond pas, le client reçoit une erreur d’outil plutôt que des données malformées.

## Erreurs

Levez une erreur dans `run`. Son message devient une erreur d’outil (`isError: true`) que le modèle peut lire et à laquelle il peut réagir :

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Écrivez les messages d’erreur pour le modèle : dites ce qui n’a pas marché et quoi faire ensuite.

Les erreurs d’outil font partie d’une conversation normale. Les erreurs de protocole, non : n’utilisez `McpError` que si la requête elle-même est fautive, par exemple quand l’utilisateur n’a pas les droits :

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Annulation

Le second argument de `run` porte un `AbortSignal`. Il est déclenché quand le client envoie `notifications/cancelled`, en général parce que l’utilisateur a cliqué sur stop. Passez-le à `fetch` et aux autres API qui l’acceptent :

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

Une fois une requête annulée, picomcp n’envoie aucune réponse pour elle, comme l’exige le protocole.

## Métadonnées

`ctx.meta` contient l’objet `_meta` envoyé par le client avec la requête, s’il y en a un. Les clients s’en servent pour le traçage et les jetons de progression.

## Écrire de bons outils

- **Une tâche par outil.** `create_invoice` et `send_invoice` valent mieux que `invoice(action)`.
- **Décrivez les arguments.** `.describe()` sur chaque champ se retrouve dans le JSON Schema que voit le modèle.
- **Renvoyez moins.** Le modèle paie chaque token. Renvoyez les champs utiles, pas toute la réponse de l’API.
- **Annotez honnêtement.** `readOnlyHint: true` permet aux clients de sauter la demande de confirmation. Ne le mettez jamais sur un outil qui écrit.
