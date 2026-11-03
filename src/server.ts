import { PROTOCOL_VERSIONS } from "./constants.ts";
import { base64, text, toResult } from "./content.ts";
import { createFetch } from "./http.ts";
import { toJsonSchema, validate } from "./schema.ts";
import { serveStdio } from "./stdio.ts";
import { listen } from "./listen.ts";
import type {
  CallToolResult,
  Context,
  JsonRpcResponse,
  JsonSchema,
  PromptConfig,
  RequestId,
  ResourceConfig,
  Schema,
  Server,
  ServerInfo,
  ToolConfig,
} from "./types.ts";

/** A JSON-RPC error. Throw it from a handler to answer with a protocol error. */
export class McpError extends Error {
  readonly code: number;
  readonly data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }
}

const INVALID_PARAMS = -32602;
const TOOL_NAME = /^[\w.-]{1,128}$/;

type Handler = (params: Record<string, any>, ctx: Context) => unknown;

interface Tool {
  def: Record<string, unknown>;
  config: ToolConfig<Schema | undefined, Schema | undefined>;
}

interface Resource {
  def: Record<string, unknown>;
  config: ResourceConfig<string>;
  match: (uri: string) => Record<string, string> | undefined;
}

interface Prompt {
  def: Record<string, unknown>;
  config: PromptConfig<Schema | undefined>;
}

const errorResult = (message: string): CallToolResult => ({ content: [text(message)], isError: true });
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));
const compact = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * Creates an MCP server.
 *
 * @example
 * const server = pico({ name: "weather" })
 *   .tool("forecast", {
 *     input: z.object({ city: z.string() }),
 *     run: ({ city }) => getForecast(city),
 *   });
 *
 * server.serve();
 */
export function pico(info: ServerInfo): Server {
  const tools = new Map<string, Tool>();
  const resources = new Map<string, Resource>();
  const templates: Resource[] = [];
  const prompts = new Map<string, Prompt>();
  const inflight = new Map<RequestId, AbortController>();

  const unique = (taken: boolean, kind: string, name: string) => {
    if (taken) throw new TypeError(`picomcp: ${kind} "${name}" is already registered`);
  };

  async function callTool(name: string, args: unknown, ctx: Context): Promise<CallToolResult> {
    const tool = tools.get(name);
    if (!tool) throw new McpError(INVALID_PARAMS, `Unknown tool: ${name}`);
    const { input, output, run } = tool.config;
    const parsed = await validate(input, args);
    if (!parsed.ok) return errorResult(`Invalid arguments for tool "${name}":\n${parsed.message}`);
    try {
      const value = await run(parsed.value, ctx);
      if (!output) return toResult(value, false);
      const checked = await validate(output, value);
      if (!checked.ok) return errorResult(`Tool "${name}" returned invalid output:\n${checked.message}`);
      return toResult(checked.value, true);
    } catch (e) {
      return errorResult(messageOf(e));
    }
  }

  async function readResource(uri: string, ctx: Context) {
    let resource = resources.get(uri);
    let params: Record<string, string> | undefined = {};
    if (!resource) {
      for (const t of templates) if ((params = t.match(uri))) { resource = t; break; }
    }
    if (!resource || !params) throw new McpError(-32002, `Resource not found: ${uri}`, { uri });
    const { read, mimeType } = resource.config;
    const value = await read(params as any, { ...ctx, uri });
    if (typeof value === "string") return [{ uri, mimeType: mimeType ?? "text/plain", text: value }];
    if (value instanceof Uint8Array) return [{ uri, mimeType: mimeType ?? "application/octet-stream", blob: base64(value) }];
    if (Array.isArray(value) && value.every((c) => c && typeof c.uri === "string")) return value;
    return [{ uri, mimeType: mimeType ?? "application/json", text: JSON.stringify(value) }];
  }

  async function getPrompt(name: string, args: unknown, ctx: Context) {
    const prompt = prompts.get(name);
    if (!prompt) throw new McpError(INVALID_PARAMS, `Unknown prompt: ${name}`);
    const parsed = await validate(prompt.config.args, args);
    if (!parsed.ok) throw new McpError(INVALID_PARAMS, `Invalid arguments for prompt "${name}":\n${parsed.message}`);
    const value = await prompt.config.run(parsed.value, ctx);
    const description = prompt.config.description;
    if (typeof value === "string") return compact({ description, messages: [{ role: "user", content: text(value) }] });
    if (Array.isArray(value)) return compact({ description, messages: value });
    return { description, ...value };
  }

  const methods: Record<string, Handler> = {
    initialize: (p) => ({
      protocolVersion: PROTOCOL_VERSIONS.includes(p.protocolVersion) ? p.protocolVersion : PROTOCOL_VERSIONS[0],
      capabilities: compact({
        tools: tools.size ? {} : undefined,
        resources: resources.size || templates.length ? {} : undefined,
        prompts: prompts.size ? {} : undefined,
      }),
      serverInfo: compact({ name: info.name, version: info.version ?? "0.0.0", title: info.title }),
      ...(info.instructions && { instructions: info.instructions }),
    }),
    ping: () => ({}),
    "tools/list": () => ({ tools: [...tools.values()].map((t) => t.def) }),
    "tools/call": (p, ctx) => callTool(p.name, p.arguments, ctx),
    "resources/list": () => ({ resources: [...resources.values()].map((r) => r.def) }),
    "resources/templates/list": () => ({ resourceTemplates: templates.map((r) => r.def) }),
    "resources/read": async (p, ctx) => ({ contents: await readResource(p.uri, ctx) }),
    "prompts/list": () => ({ prompts: [...prompts.values()].map((p) => p.def) }),
    "prompts/get": (p, ctx) => getPrompt(p.name, p.arguments, ctx),
  };

  async function one(msg: any): Promise<JsonRpcResponse | undefined> {
    const fail = (code: number, message: string, data?: unknown): JsonRpcResponse => ({
      jsonrpc: "2.0",
      id: msg?.id ?? null,
      error: compact({ code, message, data }),
    });
    if (typeof msg !== "object" || msg === null || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      // Responses to server-initiated requests are not used by picomcp: ignore them.
      if (msg && typeof msg === "object" && ("result" in msg || "error" in msg)) return;
      return fail(-32600, "Invalid request");
    }
    const { id, method } = msg;
    const params: Record<string, any> = msg.params ?? {};
    if (id === undefined) {
      if (method === "notifications/cancelled") inflight.get(params.requestId)?.abort(params.reason);
      return;
    }
    const handler = methods[method];
    if (!handler) return fail(-32601, `Method not found: ${method}`);
    const controller = new AbortController();
    inflight.set(id, controller);
    let response: JsonRpcResponse;
    try {
      response = { jsonrpc: "2.0", id, result: await handler(params, { signal: controller.signal, meta: params._meta }) };
    } catch (e) {
      response = e instanceof McpError ? fail(e.code, e.message, e.data) : fail(-32603, messageOf(e));
    } finally {
      inflight.delete(id);
    }
    // The spec says a cancelled request gets no response.
    return controller.signal.aborted ? undefined : response;
  }

  const server: Server<any> = {
    tool(name, config) {
      if (!TOOL_NAME.test(name)) throw new TypeError(`picomcp: invalid tool name "${name}" (use 1-128 letters, digits, _ . -)`);
      unique(tools.has(name), "tool", name);
      const def = compact({
        name,
        title: config.title,
        description: config.description,
        inputSchema: toJsonSchema(config.input, "input"),
        outputSchema: config.output && toJsonSchema(config.output, "output"),
        annotations: config.annotations,
      });
      tools.set(name, { def, config: config as Tool["config"] });
      return server;
    },

    resource(uri, config) {
      const isTemplate = uri.includes("{");
      const def = compact({
        [isTemplate ? "uriTemplate" : "uri"]: uri,
        name: config.name ?? uri,
        title: config.title,
        description: config.description,
        mimeType: config.mimeType,
        annotations: config.annotations,
      });
      const entry: Resource = { def, config: config as ResourceConfig<string>, match: compileTemplate(uri) };
      unique(resources.has(uri) || templates.some((t) => t.def.uriTemplate === uri), "resource", uri);
      if (isTemplate) templates.push(entry);
      else resources.set(uri, entry);
      return server;
    },

    prompt(name, config) {
      unique(prompts.has(name), "prompt", name);
      const json: JsonSchema = config.args ? toJsonSchema(config.args, "input") : {};
      const properties = (json.properties ?? {}) as Record<string, { description?: string }>;
      const required = (json.required ?? []) as string[];
      const def = compact({
        name,
        title: config.title,
        description: config.description,
        arguments: Object.keys(properties).map((key) =>
          compact({ name: key, description: properties[key]?.description, required: required.includes(key) }),
        ),
      });
      prompts.set(name, { def, config: config as Prompt["config"] });
      return server;
    },

    call: (name: string, input?: unknown) => callTool(name, input, { signal: new AbortController().signal, meta: undefined }),

    async handle(message) {
      if (!Array.isArray(message)) return one(message);
      const responses = (await Promise.all(message.map(one))).filter((r) => r !== undefined);
      return responses.length ? responses : undefined;
    },

    fetch: (request) => createFetch(server.handle, info.origins)(request),

    serve: (options = {}) => (options.http === undefined ? serveStdio(server.handle) : listen(server.fetch, options.http)),
  };

  return server;
}

/** Compiles an RFC 6570 level-1/2 URI template (`{var}`, `{+var}`) into a matcher. */
export function compileTemplate(template: string): (uri: string) => Record<string, string> | undefined {
  const names: string[] = [];
  const source = template.replace(/\{(\+?)([^}]+)\}|[.*+?^$()|[\]\\]/g, (match, plus: string, name?: string) => {
    if (!name) return `\\${match}`;
    names.push(name);
    return plus ? "(.+)" : "([^/?#]+)";
  });
  const pattern = new RegExp(`^${source}$`);
  return (uri) => {
    const found = pattern.exec(uri);
    if (!found) return;
    const params: Record<string, string> = {};
    try {
      names.forEach((name, i) => (params[name] = decodeURIComponent(found[i + 1]!)));
    } catch {
      return;
    }
    return params;
  };
}
