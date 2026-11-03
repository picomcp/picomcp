---
title: Conectar un cliente
description: Configuración para Claude Code, Claude Desktop, Cursor, VS Code y MCP Inspector.
group: Primeros pasos
---

# Conectar un cliente

Todos los clientes MCP arrancan un servidor local de la misma forma: ejecutan un comando y le hablan por stdio. A los servidores remotos se llega por URL, con Streamable HTTP. Usa rutas absolutas en todas las configuraciones de abajo.

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

Añade `--scope project` para escribir el servidor en `.mcp.json` y compartirlo con tu equipo.

## Claude Desktop

Edita `claude_desktop_config.json` (Ajustes → Desarrollador → Editar configuración) y reinicia la aplicación:

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

Crea `.cursor/mcp.json` en tu proyecto, o `~/.cursor/mcp.json` para todos tus proyectos:

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

Crea `.vscode/mcp.json`:

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

Para inspeccionar un servidor HTTP, arráncalo con `serve({ http: 3000 })`, abre el Inspector, elige **Streamable HTTP** e introduce `http://127.0.0.1:3000/mcp`. El Inspector se ejecuta en localhost, que picomcp permite por defecto.

## Bun y Deno

Sustituye `node` por tu runtime:

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## Solución de problemas

**El cliente no muestra ninguna herramienta.** Ejecuta tú mismo el comando de la configuración. Si termina o muestra un error, el cliente ve lo mismo.

**«Unexpected token» o errores de JSON en el log del cliente.** Algo ha escrito en stdout. picomcp redirige `console.log` a stderr cuando sirve por stdio, pero otras librerías pueden escribir directamente en `process.stdout`.

**Node no puede ejecutar archivos `.ts`.** Actualiza a Node 22.18 o posterior, o ejecuta el servidor con Bun.
