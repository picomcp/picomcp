---
title: Prompts
description: Wiederverwendbare Prompt-Vorlagen anbieten, die Nutzer im Client auswählen, mit validierten Argumenten.
group: Anleitungen
---

# Prompts

Prompts sind Vorlagen, die der Nutzer im Client auswählt, oft als Slash-Befehle. Sie machen aus ein paar Argumenten eine oder mehrere Nachrichten.

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

Der Client zeigt `diff` als Pflichtfeld und `focus` als optional an, jeweils mit Beschreibung, alles aus dem Schema abgeleitet.

## Argumente sind Strings

MCP überträgt Prompt-Argumente als Strings. Verwende String-Schemas oder konvertiere:

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Ungültige Argumente werden mit einem `Invalid params`-Fehler abgewiesen, bevor `run` aufgerufen wird.

## Rückgabewerte

| `run` gibt zurück | Gesendete Nachrichten |
| --- | --- |
| `string` | Eine Nutzernachricht |
| `PromptMessage[]` | Diese Nachrichten |
| `{ description, messages }` | Das vollständige Ergebnis |

Nimm ein Array für Vorlagen mit mehreren Runden oder um Medien einzubinden:

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
