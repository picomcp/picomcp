---
title: Cobertura del protocolo
description: Qué partes exactas de la especificación MCP implementa picomcp, y cuáles todavía no.
group: Referencia
---

# Cobertura del protocolo

picomcp apunta a MCP `2025-11-25` y negocia hacia `2025-06-18`, `2025-03-26` y `2024-11-05`. Cada función marcada como soportada está cubierta por tests, incluidos tests de extremo a extremo con el cliente del SDK oficial de TypeScript.

## Soportado

| Área | Función |
| --- | --- |
| Ciclo de vida | `initialize` con negociación de versión, `notifications/initialized`, `ping` |
| Herramientas | `tools/list`, `tools/call`, validación de entrada, `outputSchema` y `structuredContent`, anotaciones, títulos |
| Contenido | texto, imagen, audio, enlaces a recursos, recursos incrustados |
| Recursos | `resources/list`, `resources/templates/list`, `resources/read`, contenido de texto y binario |
| Prompts | `prompts/list`, `prompts/get`, argumentos deducidos de los esquemas |
| Utilidades | `notifications/cancelled` con `AbortSignal` |
| JSON-RPC | Lotes, códigos de error, respuestas del cliente ignoradas |
| stdio | JSON delimitado por saltos de línea, stdout protegido de logs perdidos |
| Streamable HTTP | Respuestas JSON sin estado, `202` para notificaciones, `405` para `GET`, CORS, comprobación de `Origin` y `MCP-Protocol-Version` |

## Todavía no soportado

| Función | Por qué |
| --- | --- |
| Sampling, elicitation, roots | Requieren que el servidor envíe peticiones al cliente. El diseño sin estado de picomcp aún no mantiene un canal abierto para ello. |
| Notificaciones de log, de progreso y `list_changed` | Mismo motivo: mensajes del servidor al cliente. |
| Suscripciones a recursos | Mismo motivo. |
| Autocompletado | Previsto. |
| Cursores de paginación | Las listas se devuelven completas, lo que va bien para servidores con hasta unos cientos de entradas. |
| Sesiones (`Mcp-Session-Id`) y flujos SSE | No hacen falta en modo sin estado. |
| Tasks | Experimental en la especificación. |

¿Necesitas alguna? [Abre una issue](https://github.com/picomcp/picomcp/issues) y describe tu caso de uso. Las funciones llegan cuando se pueden añadir sin hacer grande a picomcp.
