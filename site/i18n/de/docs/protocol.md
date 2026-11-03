---
title: Protokollabdeckung
description: Welche Teile der MCP-Spezifikation picomcp genau implementiert und welche noch nicht.
group: Referenz
---

# Protokollabdeckung

picomcp zielt auf MCP `2025-11-25` und handelt bei Bedarf `2025-06-18`, `2025-03-26` und `2024-11-05` aus. Jede als unterstützt markierte Funktion ist durch Tests abgedeckt, darunter Ende-zu-Ende-Tests mit dem Client des offiziellen TypeScript-SDK.

## Unterstützt

| Bereich | Funktion |
| --- | --- |
| Lebenszyklus | `initialize` mit Versionsaushandlung, `notifications/initialized`, `ping` |
| Tools | `tools/list`, `tools/call`, Eingabevalidierung, `outputSchema` und `structuredContent`, Annotationen, Titel |
| Inhalte | Text, Bild, Audio, Ressourcen-Links, eingebettete Ressourcen |
| Ressourcen | `resources/list`, `resources/templates/list`, `resources/read`, Text- und Binärinhalte |
| Prompts | `prompts/list`, `prompts/get`, aus Schemas abgeleitete Argumente |
| Hilfsfunktionen | `notifications/cancelled` mit `AbortSignal` |
| JSON-RPC | Batches, Fehlercodes, Antworten des Clients werden ignoriert |
| stdio | Zeilengetrenntes JSON, stdout vor verirrten Logs geschützt |
| Streamable HTTP | Zustandslose JSON-Antworten, `202` für Benachrichtigungen, `405` für `GET`, CORS, Prüfung von `Origin` und `MCP-Protocol-Version` |

## Noch nicht unterstützt

| Funktion | Warum |
| --- | --- |
| Sampling, Elicitation, Roots | Dafür muss der Server Anfragen an den Client senden. Das zustandslose Design von picomcp hält dafür noch keinen Kanal offen. |
| Log-, Fortschritts- und `list_changed`-Benachrichtigungen | Gleicher Grund: Nachrichten vom Server an den Client. |
| Ressourcen-Abonnements | Gleicher Grund. |
| Vervollständigungen | Geplant. |
| Paginierungs-Cursor | Listen werden vollständig zurückgegeben. Das passt für Server mit bis zu einigen Hundert Einträgen. |
| Sessions (`Mcp-Session-Id`) und SSE-Streams | Im zustandslosen Modus nicht nötig. |
| Tasks | In der Spezifikation noch experimentell. |

Du brauchst eine davon? [Eröffne ein Issue](https://github.com/picomcp/picomcp/issues) und beschreibe deinen Anwendungsfall. Funktionen kommen hinzu, wenn sie sich hinzufügen lassen, ohne picomcp groß zu machen.
