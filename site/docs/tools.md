---
title: Tools
description: Define tools, validate input, return text, objects or media, report errors and handle cancellation.
group: Guides
---

# Tools

A tool is a function the model can call. Register one with `server.tool(name, config)`:

```ts
server.tool("search_issues", {
  title: "Search issues",
  description: "Search open GitHub issues in a repository. Use it before filing a new issue.",
  input: z.object({
    repo: z.string().describe("owner/name"),
    query: z.string(),
    limit: z.number().int().max(50).default(10),
  }),
  annotations: { readOnlyHint: true, openWorldHint: true },
  run: async ({ repo, query, limit }, { signal }) => {
    const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} repo:${repo}`)}&per_page=${limit}`, { signal });
    const { items } = await res.json();
    return items.map((i: { title: string; html_url: string }) => `${i.title} — ${i.html_url}`).join("\n");
  },
});
```

## Configuration

| Option | Type | Description |
| --- | --- | --- |
| `description` | `string` | What the tool does and when to use it. The model reads this. |
| `title` | `string` | Display name for clients. |
| `input` | Standard Schema | Arguments schema. Omit it for tools without arguments. |
| `output` | Standard Schema | Structured result schema. See [Structured output](#structured-output). |
| `annotations` | `ToolAnnotations` | Hints for clients: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. |
| `run` | `(input, ctx) => value` | The handler. Can be async. |

Tool names must be 1 to 128 characters long and use only letters, digits, `_`, `.` and `-`. Registering an invalid or duplicate name throws immediately, so mistakes show up when the server starts, not when a model calls the tool.

## Input validation

picomcp validates arguments with your schema before calling `run`. Defaults and transforms apply, so `limit` above is always a number inside `run`.

When validation fails, the tool is not called. The client receives a tool error that names the bad field, so the model can fix its call and retry:

```text
Invalid arguments for tool "search_issues":
limit: Too big: expected number to be <=50
```

## Return values

Return whatever is natural. picomcp turns it into an MCP result:

| `run` returns | The client receives |
| --- | --- |
| `string` | One text block |
| an object, array or number | Its JSON as text. Objects are also sent as `structuredContent`. |
| a content block, or an array of them | Those blocks as they are |
| `{ content: [...] }` | The result as it is, for full control |
| `undefined` | An empty result |

Build content blocks with the helpers:

```ts
import { audio, image, link, text } from "picomcp";

run: async () => [
  text("Here is the chart:"),
  image(await renderPng(), "image/png"), // Uint8Array or base64 string
  link("file:///reports/q3.csv", "q3.csv", { mimeType: "text/csv" }),
];
```

## Structured output

Declare an `output` schema when clients or code consume the result, not only the model:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ sku: z.string(), cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ sku, cents: await priceOf(sku), currency: "EUR" }),
});
```

picomcp then:

1. advertises the schema as `outputSchema` in `tools/list`,
2. type-checks the return value of `run` against it,
3. validates the value at runtime and sends it as `structuredContent`, with a JSON text copy for older clients.

If the value does not match, the client receives a tool error instead of malformed data.

## Errors

Throw from `run`. The error message becomes a tool error (`isError: true`) that the model can read and react to:

```ts
run: async ({ id }) => {
  const user = await db.users.find(id);
  if (!user) throw new Error(`No user with id ${id}. Call list_users to see valid ids.`);
  return user;
};
```

Write error messages for the model: say what went wrong and what to do next.

Tool errors are part of a normal conversation. Protocol errors are not: use `McpError` only when the request itself is wrong, for example when the user lacks access:

```ts
import { McpError } from "picomcp";

throw new McpError(-32001, "Not authorised for this workspace");
```

## Cancellation

The second argument of `run` carries an `AbortSignal`. It aborts when the client sends `notifications/cancelled`, typically because the user pressed stop. Pass it to `fetch` and other APIs that accept one:

```ts
run: async ({ url }, { signal }) => {
  const res = await fetch(url, { signal });
  return res.text();
};
```

Once a request is cancelled, picomcp sends no response for it, as the protocol requires.

## Metadata

`ctx.meta` holds the `_meta` object the client sent with the request, if any. Clients use it for tracing and progress tokens.

## Writing good tools

- **One job per tool.** `create_invoice` and `send_invoice` beat `invoice(action)`.
- **Describe arguments.** `.describe()` on each field ends up in the JSON Schema the model sees.
- **Return less.** Models pay for every token. Return the fields that matter, not the whole API response.
- **Annotate honestly.** `readOnlyHint: true` lets clients skip confirmation prompts. Never set it on a tool that writes.
