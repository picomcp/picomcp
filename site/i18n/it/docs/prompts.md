---
title: Prompt
description: Offrire modelli di prompt riutilizzabili che l’utente sceglie dal client, con argomenti validati.
group: Guide
---

# Prompt

I prompt sono modelli che l’utente sceglie dal client, spesso come comandi slash. Trasformano qualche argomento in uno o più messaggi.

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

Il client mostra `diff` come obbligatorio e `focus` come facoltativo, con le loro descrizioni, il tutto ricavato dallo schema.

## Gli argomenti sono stringhe

MCP invia gli argomenti dei prompt come stringhe. Usa schemi di stringhe, oppure converti:

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Gli argomenti non validi vengono respinti con un errore `Invalid params` prima che `run` venga chiamato.

## Valori di ritorno

| `run` restituisce | Messaggi inviati |
| --- | --- |
| `string` | Un messaggio utente |
| `PromptMessage[]` | Quei messaggi |
| `{ description, messages }` | Il risultato completo |

Usa un array per i modelli a più turni o per includere media:

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
