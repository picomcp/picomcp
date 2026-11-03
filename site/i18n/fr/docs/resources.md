---
title: Ressources
description: Exposer des fichiers, des enregistrements et des données vivantes que le client peut lire, avec des templates d’URI typés.
group: Guides
---

# Ressources

Les ressources sont des données que le client peut lire et joindre à une conversation : fichiers, lignes de base de données, réponses d’API. Les outils sont appelés par le modèle ; les ressources sont en général choisies par l’utilisateur ou l’application.

```ts
server.resource("config://app", {
  description: "The app configuration",
  read: () => loadConfig(),
});
```

## Templates d’URI

Mettez des `{variables}` dans l’URI pour servir toute une famille de ressources. Les variables sont typées à partir de la chaîne elle-même :

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

| Syntaxe | Correspond à | Exemple |
| --- | --- | --- |
| `{name}` | Un segment de chemin, sans `/`, `?` ni `#` | `users://{id}` correspond à `users://42` |
| `{+name}` | N’importe quoi, `/` compris | `files://{+path}` correspond à `files://src/index.ts` |

Les valeurs sont décodées (URL) avant d’arriver dans `read`. Les ressources statiques apparaissent dans `resources/list`, les templates dans `resources/templates/list`.

## Valeurs de retour

| `read` renvoie | Contenu envoyé |
| --- | --- |
| `string` | Du texte, avec `mimeType` ou `text/plain` |
| `Uint8Array` | Un blob en base64, avec `mimeType` ou `application/octet-stream` |
| un tableau de `{ uri, text }` ou `{ uri, blob }` | Ces contenus, tels quels |
| toute autre valeur | Son JSON, en `application/json` |

`read` reçoit le contexte en second argument, avec l’`uri` demandée en plus :

```ts
read: (params, { uri, signal }) => fetch(toHttp(uri), { signal }).then((r) => r.text());
```

## Options

| Option | Description |
| --- | --- |
| `name` | Identifiant affiché aux utilisateurs. Par défaut, l’URI. |
| `title` | Nom affiché. |
| `description` | Ce que contient la ressource. |
| `mimeType` | Type de contenu de ce que renvoie `read`. |
| `annotations` | Indications `audience`, `priority` et `lastModified`. |

## Introuvable

Quand aucune ressource ne correspond à une URI, picomcp répond avec l’erreur `-32002 Resource not found` du protocole. Pour rejeter une URI qui correspond à un template mais ne désigne rien, levez une `McpError` avec le même code :

```ts
import { McpError } from "picomcp";

read: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new McpError(-32002, `Resource not found: users://${id}`);
  return user;
};
```

## Lier depuis un outil

Un outil peut orienter le modèle vers une ressource au lieu de l’inclure, ce qui garde les gros volumes hors du contexte tant qu’on n’en a pas besoin :

```ts
import { link } from "picomcp";

run: async () => link("reports://2026-q3", "Q3 report", { mimeType: "application/pdf" });
```
