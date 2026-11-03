---
title: Connecter un client
description: La configuration pour Claude Code, Claude Desktop, Cursor, VS Code et MCP Inspector.
group: Bien démarrer
---

# Connecter un client

Tous les clients MCP lancent un serveur local de la même façon : ils exécutent une commande et lui parlent en stdio. Les serveurs distants s’atteignent par URL, en Streamable HTTP. Utilisez des chemins absolus dans toutes les configurations ci-dessous.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Ajoutez `--scope project` pour écrire le serveur dans `.mcp.json` et le partager avec votre équipe.

## Claude Desktop

Modifiez `claude_desktop_config.json` (Réglages → Développeur → Modifier la configuration), puis redémarrez l’application :

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/main.ts"]
    }
  }
}
```

## Cursor

Créez `.cursor/mcp.json` dans votre projet, ou `~/.cursor/mcp.json` pour tous vos projets :

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Créez `.vscode/mcp.json` :

```json
{
  "servers": {
    "weather": { "type": "stdio", "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## MCP Inspector

```sh
npx @modelcontextprotocol/inspector node /absolute/path/main.ts
```

Pour inspecter un serveur HTTP, démarrez-le avec `serve({ http: 3000 })`, ouvrez l’Inspector, choisissez **Streamable HTTP** et saisissez `http://127.0.0.1:3000/mcp`. L’Inspector tourne sur localhost, ce que picomcp autorise par défaut.

## Bun et Deno

Remplacez `node` par votre runtime :

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Dépannage

**Le client n’affiche aucun outil.** Lancez vous-même la commande de la configuration. Si elle s’arrête ou affiche une erreur, le client voit la même chose.

**« Unexpected token » ou erreurs JSON dans les logs du client.** Quelque chose a écrit sur stdout. picomcp redirige `console.log` vers stderr quand il sert en stdio, mais d’autres bibliothèques peuvent écrire directement dans `process.stdout`.

**Node refuse d’exécuter les fichiers `.ts`.** Passez à Node 22.18 ou plus récent, ou lancez le serveur avec Bun.
