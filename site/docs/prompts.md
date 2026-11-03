---
title: Prompts
description: Offer reusable prompt templates that users pick from the client, with validated arguments.
group: Guides
---

# Prompts

Prompts are templates the user picks from the client, often as slash commands. They turn a few arguments into one or more messages.

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

The client lists `diff` as required and `focus` as optional, with their descriptions, both derived from the schema.

## Arguments are strings

MCP sends prompt arguments as strings. Use string schemas, or coerce:

```ts
args: z.object({ count: z.coerce.number().int().min(1) });
```

Invalid arguments are rejected with an `Invalid params` error before `run` is called.

## Return values

| `run` returns | Messages sent |
| --- | --- |
| `string` | One user message |
| `PromptMessage[]` | Those messages |
| `{ description, messages }` | The full result |

Use an array for multi-turn templates or to include media:

```ts
import { image, text } from "picomcp";

run: async ({ id }) => [
  { role: "user", content: text("What is wrong with this screenshot?") },
  { role: "user", content: image(await screenshot(id), "image/png") },
];
```
