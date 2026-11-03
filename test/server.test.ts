import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { type } from "arktype";
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { McpError, PROTOCOL_VERSIONS, image, link, pico, text, withJsonSchema } from "../src/index.ts";
import type { StandardSchemaV1, UriParams } from "../src/index.ts";

const rpc = (method: string, params?: Record<string, unknown>, id: number | string = 1) => ({ jsonrpc: "2.0", id, method, params });

const weather = () =>
  pico({ name: "weather", version: "1.2.3", instructions: "Use forecast for weather questions." }).tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string().describe("City name"), days: z.number().int().min(1).max(7).default(1) }),
    run: ({ city, days }) => `${city}: sunny for ${days} day(s)`,
  });

describe("lifecycle", () => {
  it("answers initialize with capabilities, info and instructions", async () => {
    const res = await weather().handle(rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } }));
    expect(res).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "weather", version: "1.2.3" },
        instructions: "Use forecast for weather questions.",
      },
    });
  });

  it("falls back to the latest protocol version it supports", async () => {
    const res: any = await weather().handle(rpc("initialize", { protocolVersion: "1999-01-01" }));
    expect(res.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("only advertises capabilities that are registered", async () => {
    const res: any = await pico({ name: "empty" }).handle(rpc("initialize", {}));
    expect(res.result.capabilities).toEqual({});
  });

  it("answers ping and ignores notifications", async () => {
    const server = weather();
    expect(await server.handle(rpc("ping"))).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
    expect(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeUndefined();
  });
});

describe("json-rpc", () => {
  it("rejects malformed requests", async () => {
    expect(await weather().handle({ hello: "world" })).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it("reports unknown methods", async () => {
    expect(await weather().handle(rpc("nope/nope"))).toMatchObject({ error: { code: -32601 } });
  });

  it("handles batches and drops notification responses", async () => {
    const res = await weather().handle([rpc("ping", {}, 1), { jsonrpc: "2.0", method: "notifications/initialized" }, rpc("ping", {}, 2)]);
    expect(res).toEqual([
      { jsonrpc: "2.0", id: 1, result: {} },
      { jsonrpc: "2.0", id: 2, result: {} },
    ]);
  });

  it("ignores responses sent by the client", async () => {
    expect(await weather().handle({ jsonrpc: "2.0", id: 9, result: {} })).toBeUndefined();
  });

  it("aborts the handler signal on notifications/cancelled and sends no response", async () => {
    let started!: () => void;
    const running = new Promise<void>((r) => (started = r));
    const server = pico({ name: "slow" }).tool("wait", {
      run: (_, { signal }) =>
        new Promise<string>((resolve) => {
          signal.addEventListener("abort", () => resolve(`aborted: ${signal.reason}`));
          started();
        }),
    });
    const pending = server.handle(rpc("tools/call", { name: "wait" }, 42));
    await running;
    await server.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 42, reason: "user" } });
    expect(await pending).toBeUndefined();
  });

  it("exposes an already-aborted signal when cancelled before the handler runs", async () => {
    let seen: boolean | undefined;
    const server = pico({ name: "slow" }).tool("t", { run: (_, { signal }) => ((seen = signal.aborted), "done") });
    const pending = server.handle(rpc("tools/call", { name: "t" }, 7));
    await server.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 7 } });
    expect(await pending).toBeUndefined();
    expect(seen).toBe(true);
  });
});

describe("tools", () => {
  it("lists tools with a JSON Schema generated from Zod", async () => {
    const res: any = await weather().handle(rpc("tools/list"));
    expect(res.result.tools).toEqual([
      {
        name: "forecast",
        description: "Get the forecast for a city.",
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name" },
            days: { type: "integer", minimum: 1, maximum: 7, default: 1 },
          },
          required: ["city"],
        },
      },
    ]);
  });

  it("validates, applies defaults and calls the tool", async () => {
    expect(await weather().call("forecast", { city: "Lyon" })).toEqual({ content: [{ type: "text", text: "Lyon: sunny for 1 day(s)" }] });
  });

  it("returns validation errors as tool errors the model can read", async () => {
    const res = await weather().call("forecast", { city: "Lyon", days: 30 });
    expect(res.isError).toBe(true);
    expect(res.content[0]).toMatchObject({ type: "text", text: expect.stringContaining("days:") });
  });

  it("turns thrown errors into isError results", async () => {
    const server = pico({ name: "x" }).tool("boom", {
      run: () => {
        throw new Error("Upstream API is down");
      },
    });
    expect(await server.call("boom")).toEqual({ content: [{ type: "text", text: "Upstream API is down" }], isError: true });
  });

  it("answers unknown tools with a protocol error", async () => {
    expect(await weather().handle(rpc("tools/call", { name: "nope" }))).toMatchObject({ error: { code: -32602, message: "Unknown tool: nope" } });
  });

  it("normalises return values", async () => {
    const server = pico({ name: "x" })
      .tool("obj", { run: () => ({ a: 1 }) })
      .tool("arr", { run: () => [1, 2] })
      .tool("none", { run: () => undefined })
      .tool("blocks", { run: () => [text("hi"), image(new Uint8Array([1, 2, 3]), "image/png")] })
      .tool("link", { run: () => link("file:///a.txt", "a.txt") })
      .tool("raw", { run: () => ({ content: [text("raw")], isError: true }) });

    expect(await server.call("obj")).toEqual({ content: [text('{"a":1}')], structuredContent: { a: 1 } });
    expect(await server.call("arr")).toEqual({ content: [text("[1,2]")] });
    expect(await server.call("none")).toEqual({ content: [] });
    expect(await server.call("blocks")).toEqual({ content: [text("hi"), { type: "image", data: "AQID", mimeType: "image/png" }] });
    expect(await server.call("link")).toEqual({ content: [{ type: "resource_link", uri: "file:///a.txt", name: "a.txt" }] });
    expect(await server.call("raw")).toEqual({ content: [text("raw")], isError: true });
  });

  it("returns structuredContent and outputSchema when output is declared", async () => {
    const server = pico({ name: "x" }).tool("sum", {
      input: z.object({ a: z.number(), b: z.number() }),
      output: z.object({ total: z.number() }),
      run: ({ a, b }) => ({ total: a + b }),
    });
    const list: any = await server.handle(rpc("tools/list"));
    expect(list.result.tools[0].outputSchema).toMatchObject({ type: "object", required: ["total"] });
    expect(await server.call("sum", { a: 2, b: 3 })).toEqual({ content: [text('{"total":5}')], structuredContent: { total: 5 } });
  });

  it("rejects output that does not match the output schema", async () => {
    const server = pico({ name: "x" }).tool("bad", { output: z.object({ n: z.number() }), run: () => ({ n: "nope" }) as any });
    expect((await server.call("bad")).isError).toBe(true);
  });

  it("works with ArkType and Valibot", async () => {
    const server = pico({ name: "x" })
      .tool("ark", { input: type({ name: "string" }), run: ({ name }) => `ark ${name}` })
      .tool("vali", { input: toStandardJsonSchema(v.object({ name: v.string() })), run: ({ name }) => `vali ${name}` });
    const list: any = await server.handle(rpc("tools/list"));
    expect(list.result.tools.map((t: any) => t.inputSchema.properties.name.type)).toEqual(["string", "string"]);
    expect(await server.call("ark", { name: "a" })).toEqual({ content: [text("ark a")] });
    expect(await server.call("vali", { name: "v" })).toEqual({ content: [text("vali v")] });
  });

  it("accepts schemas without JSON Schema support through withJsonSchema", async () => {
    const bare: StandardSchemaV1<{ n: number }> = {
      "~standard": { version: 1, vendor: "custom", validate: (value) => ({ value: value as { n: number } }) },
    };
    expect(() => pico({ name: "x" }).tool("t", { input: bare, run: () => "" })).toThrow(/withJsonSchema/);
    const server = pico({ name: "x" }).tool("t", { input: withJsonSchema(bare, { type: "object" }), run: ({ n }) => `${n}` });
    expect(await server.call("t", { n: 7 })).toEqual({ content: [text("7")] });
  });

  it("rejects invalid and duplicate tool names at registration", () => {
    expect(() => pico({ name: "x" }).tool("has space", { run: () => "" })).toThrow(/invalid tool name/);
    expect(() => pico({ name: "x" }).tool("a", { run: () => "" }).tool("a", { run: () => "" })).toThrow(/already registered/);
  });
});

describe("resources", () => {
  const server = pico({ name: "files" })
    .resource("config://app", { description: "App config", read: () => ({ debug: true }) })
    .resource("file:///readme", { mimeType: "text/markdown", read: () => "# Hello" })
    .resource("bytes://logo", { mimeType: "image/png", read: () => new Uint8Array([255]) })
    .resource("users://{id}/posts/{post}", { name: "post", read: ({ id, post }) => `${id}/${post}` })
    .resource("docs://{+path}", { read: ({ path }) => path });

  it("lists static resources and templates separately", async () => {
    const list: any = await server.handle(rpc("resources/list"));
    expect(list.result.resources.map((r: any) => r.uri)).toEqual(["config://app", "file:///readme", "bytes://logo"]);
    const templates: any = await server.handle(rpc("resources/templates/list"));
    expect(templates.result.resourceTemplates).toEqual([
      { uriTemplate: "users://{id}/posts/{post}", name: "post" },
      { uriTemplate: "docs://{+path}", name: "docs://{+path}" },
    ]);
  });

  it("reads text, JSON and binary resources", async () => {
    const read = async (uri: string) => ((await server.handle(rpc("resources/read", { uri }))) as any).result.contents;
    expect(await read("config://app")).toEqual([{ uri: "config://app", mimeType: "application/json", text: '{"debug":true}' }]);
    expect(await read("file:///readme")).toEqual([{ uri: "file:///readme", mimeType: "text/markdown", text: "# Hello" }]);
    expect(await read("bytes://logo")).toEqual([{ uri: "bytes://logo", mimeType: "image/png", blob: "/w==" }]);
    expect(await read("users://42/posts/hello%20world")).toEqual([{ uri: "users://42/posts/hello%20world", mimeType: "text/plain", text: "42/hello world" }]);
    expect(await read("docs://guide/intro.md")).toEqual([{ uri: "docs://guide/intro.md", mimeType: "text/plain", text: "guide/intro.md" }]);
  });

  it("answers unknown resources with -32002", async () => {
    expect(await server.handle(rpc("resources/read", { uri: "nope://x" }))).toMatchObject({ error: { code: -32002 } });
  });

  it("infers template variables at the type level", () => {
    expectTypeOf<UriParams<"users://{id}/posts/{post}">>().toEqualTypeOf<{ id: string; post: string }>();
    expectTypeOf<UriParams<"docs://{+path}">>().toEqualTypeOf<{ path: string }>();
    expectTypeOf<UriParams<"config://app">>().toEqualTypeOf<{}>();
  });
});

describe("prompts", () => {
  const server = pico({ name: "p" })
    .prompt("review", {
      description: "Review code",
      args: z.object({ code: z.string().describe("The code"), style: z.string().optional() }),
      run: ({ code }) => `Review this:\n${code}`,
    })
    .prompt("chat", { run: () => [{ role: "assistant", content: text("Hi") }] });

  it("lists prompts with arguments derived from the schema", async () => {
    const list: any = await server.handle(rpc("prompts/list"));
    expect(list.result.prompts[0]).toEqual({
      name: "review",
      description: "Review code",
      arguments: [
        { name: "code", description: "The code", required: true },
        { name: "style", required: false },
      ],
    });
  });

  it("renders prompts", async () => {
    const res: any = await server.handle(rpc("prompts/get", { name: "review", arguments: { code: "x = 1" } }));
    expect(res.result).toEqual({ description: "Review code", messages: [{ role: "user", content: text("Review this:\nx = 1") }] });
    const chat: any = await server.handle(rpc("prompts/get", { name: "chat" }));
    expect(chat.result.messages).toEqual([{ role: "assistant", content: text("Hi") }]);
  });

  it("rejects invalid prompt arguments", async () => {
    expect(await server.handle(rpc("prompts/get", { name: "review", arguments: {} }))).toMatchObject({ error: { code: -32602 } });
  });
});

describe("errors", () => {
  it("lets handlers throw McpError for protocol errors", async () => {
    const server = pico({ name: "x" }).resource("a://b", {
      read: () => {
        throw new McpError(-32001, "Not allowed", { reason: "auth" });
      },
    });
    expect(await server.handle(rpc("resources/read", { uri: "a://b" }))).toEqual({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32001, message: "Not allowed", data: { reason: "auth" } },
    });
  });
});

describe("types", () => {
  it("infers tool input from the schema and types call()", () => {
    const server = pico({ name: "x" })
      .tool("forecast", {
        input: z.object({ city: z.string(), days: z.number().default(1) }),
        run: (input) => {
          expectTypeOf(input).toEqualTypeOf<{ city: string; days: number }>();
          return "";
        },
      })
      .tool("noargs", { run: (input) => (expectTypeOf(input).toEqualTypeOf<Record<string, never>>(), "") });

    expectTypeOf(server.call<"forecast">).parameter(1).toEqualTypeOf<{ city: string; days?: number | undefined }>();
    // @ts-expect-error city is required
    void (() => server.call("forecast", {}));
    // @ts-expect-error unknown tool
    void (() => server.call("nope"));
    void (() => server.call("noargs"));
  });
});
