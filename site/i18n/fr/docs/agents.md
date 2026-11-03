---
title: Pour les agents IA
description: Une doc lisible par les machines, llms.txt, des pages Markdown et des règles à donner à votre agent de code.
group: Pour les agents IA
---

# Pour les agents IA

Les agents de code écrivent beaucoup de serveurs MCP. Cette documentation est conçue pour être lue par eux autant que par vous.

## Une doc lisible par les machines

| URL | Contenu |
| --- | --- |
| [`/llms.txt`](/llms.txt) | L’index de toutes les pages avec un résumé d’une ligne, au format [llms.txt](https://llmstxt.org) |
| [`/llms-full.txt`](/llms-full.txt) | Toute la documentation dans un seul fichier Markdown |
| `/docs/<page>.md` | N’importe quelle page en Markdown. Ajoutez `.md` à son URL, par exemple [`/docs/tools.md`](/docs/tools.md) |

Chaque page a aussi un bouton **Copier en Markdown**, pour la coller dans une conversation.

Ces fichiers sont en anglais, la langue de référence et celle que les modèles suivent le mieux. Chaque traduction a aussi son propre `llms-full.txt`, par exemple `/fr/llms-full.txt`.

## Orienter votre agent vers la doc

Collez ceci dans les instructions de votre agent, par exemple dans `AGENTS.md` ou `CLAUDE.md` à la racine de votre projet :

```md
## MCP servers

This project builds MCP servers with picomcp.

- Read https://picomcp.github.io/picomcp/llms-full.txt before writing picomcp code.
- Define servers with `pico({ name })` and chain `.tool()`, `.resource()`, `.prompt()`.
- Use Zod 4 schemas with `.describe()` on every field.
- Write tool descriptions and error messages for the model: say what the tool does,
  when to use it, and what to do after an error.
- Never write to stdout in a stdio server. Use `console.error` for logs.
- Test tools with `server.call(name, input)`. Do not spawn a client in unit tests.
```

## Donner un serveur de doc à votre agent

La documentation existe aussi sous forme de serveur MCP, [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs), construit avec picomcp. Il donne aux agents trois outils, `list_docs`, `search_docs` et `read_doc`, et chaque page en tant que ressource.

Dans Claude Code :

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

Dans Cursor, Windsurf, Claude Desktop et la plupart des autres clients, ajoutez-le au fichier de configuration MCP (`.cursor/mcp.json` pour Cursor) :

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

Le code source est dans [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs), environ 100 lignes.

## Ce que les agents se trompent souvent

Voici les erreurs que font le plus souvent les modèles quand ils écrivent des serveurs MCP, et comment les choses fonctionnent dans picomcp :

- **En stdio, stdout est le protocole.** Un `console.log` le corromprait. picomcp redirige la sortie console vers stderr quand il sert en stdio, mais `process.stdout.write` reste dangereux.
- **Les erreurs d’outil sont des résultats, pas des exceptions.** Lever une erreur dans `run` produit `isError: true` avec votre message. Le modèle le voit et peut réessayer. N’attrapez pas les erreurs juste pour renvoyer des chaînes `"Error: ..."`.
- **Les arguments de prompt sont des chaînes.** Utilisez `z.coerce.number()` pour les arguments numériques.
- **Le JSON Schema vient de la bibliothèque de schémas.** Zod 4 et ArkType n’ont besoin de rien. Valibot a besoin de `toStandardJsonSchema`. Les autres, de `withJsonSchema`.
- **`server.fetch` ignore le chemin.** Routez `/mcp` vers lui vous-même, ou utilisez `serve({ http })`, qui ne répond que sur `/mcp`.
- **Le typage de `server.call` demande d’enchaîner.** `pico().tool().tool()` conserve les types. Des instructions séparées les perdent.

## Contribuer avec un agent

Le dépôt contient un [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) avec les règles pour travailler sur picomcp lui-même : le budget de taille, les commandes de test et les contraintes de conception.
