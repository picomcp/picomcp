---
title: Copertura del protocollo
description: Esattamente quali parti della specifica MCP picomcp implementa, e quali non ancora.
group: Riferimento
---

# Copertura del protocollo

picomcp punta a MCP `2025-11-25` e negozia anche `2025-06-18`, `2025-03-26` e `2024-11-05`. Ogni funzionalità indicata come supportata è coperta da test, compresi test end-to-end con il client dell’SDK TypeScript ufficiale.

## Supportato

| Area | Funzionalità |
| --- | --- |
| Ciclo di vita | `initialize` con negoziazione della versione, `notifications/initialized`, `ping` |
| Tool | `tools/list`, `tools/call`, validazione dell’input, `outputSchema` e `structuredContent`, annotazioni, titoli |
| Contenuti | testo, immagine, audio, link a risorse, risorse incorporate |
| Risorse | `resources/list`, `resources/templates/list`, `resources/read`, contenuti testuali e binari |
| Prompt | `prompts/list`, `prompts/get`, argomenti ricavati dagli schemi |
| Utilità | `notifications/cancelled` con `AbortSignal` |
| JSON-RPC | Batch, codici di errore, risposte del client ignorate |
| stdio | JSON delimitato da a capo, stdout protetto dai log fuori posto |
| Streamable HTTP | Risposte JSON senza stato, `202` per le notifiche, `405` per `GET`, CORS, controllo di `Origin` e `MCP-Protocol-Version` |

## Non ancora supportato

| Funzionalità | Perché |
| --- | --- |
| Sampling, elicitation, roots | Richiedono che il server invii richieste al client. Il design senza stato di picomcp non tiene ancora aperto un canale per questo. |
| Notifiche di log, di avanzamento e `list_changed` | Stesso motivo: messaggi dal server al client. |
| Sottoscrizioni alle risorse | Stesso motivo. |
| Completamenti | In programma. |
| Cursori di paginazione | Gli elenchi vengono restituiti per intero, il che va bene per server con fino a qualche centinaio di voci. |
| Sessioni (`Mcp-Session-Id`) e flussi SSE | Non necessari in modalità senza stato. |
| Tasks | Sperimentale nella specifica. |

Ti serve una di queste? [Apri una issue](https://github.com/picomcp/picomcp/issues) e descrivi il tuo caso d’uso. Le funzionalità arrivano quando si possono aggiungere senza appesantire picomcp.
