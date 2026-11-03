/**
 * Public types for picomcp.
 *
 * The Standard Schema interfaces are inlined (as the spec recommends) so that
 * picomcp ships with zero runtime and zero type dependencies.
 * @see https://standardschema.dev
 */

// ─── Standard Schema ─────────────────────────────────────────────────────────

/** A schema that implements Standard Schema v1 (Zod, Valibot, ArkType, …). */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
    /** Standard JSON Schema converter, when the library implements it. */
    readonly jsonSchema?: {
      readonly input: (options: { readonly target: string }) => Record<string, unknown>;
      readonly output: (options: { readonly target: string }) => Record<string, unknown>;
    };
  }
  type Result<Output> =
    | { readonly value: Output; readonly issues?: undefined }
    | { readonly issues: ReadonlyArray<Issue> };
  interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
  }
}

/** Any Standard Schema. */
export type Schema = StandardSchemaV1<any, any>;

/** The value a schema produces after validation. */
export type Infer<S> = S extends StandardSchemaV1<any, infer O> ? O : never;

/** The value a schema accepts before validation. */
export type InferInput<S> = S extends StandardSchemaV1<infer I, any> ? I : never;

/** A JSON Schema object. */
export type JsonSchema = Record<string, unknown>;

// ─── JSON-RPC ────────────────────────────────────────────────────────────────

export type RequestId = string | number;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: RequestId;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: RequestId | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ─── MCP content ─────────────────────────────────────────────────────────────

export interface Annotations {
  audience?: ("user" | "assistant")[];
  priority?: number;
  lastModified?: string;
}

export type ContentBlock =
  | { type: "text"; text: string; annotations?: Annotations }
  | { type: "image"; data: string; mimeType: string; annotations?: Annotations }
  | { type: "audio"; data: string; mimeType: string; annotations?: Annotations }
  | {
      type: "resource_link";
      uri: string;
      name: string;
      title?: string;
      description?: string;
      mimeType?: string;
      annotations?: Annotations;
    }
  | { type: "resource"; resource: ResourceContents; annotations?: Annotations };

export type ResourceContents =
  | { uri: string; mimeType?: string; text: string }
  | { uri: string; mimeType?: string; blob: string };

export interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Hints that help clients decide how to present and confirm a tool call. */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: ContentBlock;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

type MaybePromise<T> = T | Promise<T>;

/** Passed as the second argument to every handler. */
export interface Context {
  /** Aborted when the client cancels the request. */
  signal: AbortSignal;
  /** The `_meta` object the client sent with the request, if any. */
  meta: Record<string, unknown> | undefined;
}

/**
 * What a tool may return. picomcp turns it into a `CallToolResult`:
 * - `string` → one text block
 * - a content block or an array of them → used as is
 * - any other value → JSON text, plus `structuredContent` for objects
 * - throwing → `isError: true` with the error message
 */
export type ToolReturn = string | ContentBlock | ContentBlock[] | CallToolResult | unknown;

export interface ToolConfig<I extends Schema | undefined, O extends Schema | undefined> {
  /** Human-friendly name shown by clients. */
  title?: string;
  /** What the tool does. The model reads this to decide when to call it. */
  description?: string;
  /** Schema for the arguments. Omit it for tools that take none. */
  input?: I;
  /** Schema for the structured result. Enables `structuredContent`. */
  output?: O;
  annotations?: ToolAnnotations;
  run: (
    input: I extends Schema ? Infer<I> : Record<string, never>,
    ctx: Context,
  ) => MaybePromise<O extends Schema ? InferInput<O> : ToolReturn>;
}

/** Extracts `{name}` and `{+name}` variables from a URI template. */
export type UriParams<T extends string> = string extends T
  ? Record<string, string>
  : T extends `${string}{${infer P}}${infer Rest}`
    ? { [K in (P extends `+${infer N}` ? N : P) | keyof UriParams<Rest>]: string }
    : {};

/** What a resource may return: text, bytes, or a JSON-serialisable value. */
export type ResourceReturn = string | Uint8Array | ResourceContents[] | unknown;

export interface ResourceConfig<U extends string> {
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
  read: (params: UriParams<U>, ctx: Context & { uri: string }) => MaybePromise<ResourceReturn>;
}

export interface PromptConfig<A extends Schema | undefined> {
  title?: string;
  description?: string;
  /** Schema for the arguments. Prompt arguments are always strings in MCP. */
  args?: A;
  run: (
    args: A extends Schema ? Infer<A> : Record<string, never>,
    ctx: Context,
  ) => MaybePromise<string | PromptMessage[] | { description?: string; messages: PromptMessage[] }>;
}

// ─── Server ──────────────────────────────────────────────────────────────────

export interface ServerInfo {
  /** Machine-friendly server name, e.g. `"weather"`. */
  name: string;
  /** Semver of your server. Defaults to `"0.0.0"`. */
  version?: string;
  title?: string;
  /** Tells the model how to use your server as a whole. */
  instructions?: string;
  /**
   * Browser origins allowed to call the HTTP endpoint. Requests without an
   * `Origin` header (CLIs, servers, desktop apps) are always allowed.
   * Defaults to localhost origins only, which blocks DNS rebinding attacks.
   */
  origins?: string[] | "*";
}

export interface HttpOptions {
  port?: number;
  /** Defaults to `"127.0.0.1"`. Use `"0.0.0.0"` to accept remote connections. */
  hostname?: string;
  /** Endpoint path. Defaults to `"/mcp"`. */
  path?: string;
}

export interface ServeOptions {
  /** Serve over Streamable HTTP instead of stdio. A number is a port. */
  http?: number | HttpOptions;
}

export interface Running {
  /** The endpoint URL when serving over HTTP. */
  url?: string;
  close(): Promise<void>;
}

/** Type-level registry of the tools a server exposes, used by `call()`. */
export type ToolMap = Record<string, { input: unknown }>;

type ToolName<T extends ToolMap> = [keyof T] extends [never] ? string : keyof T & string;

type CallArgs<T extends ToolMap, N> = N extends keyof T
  ? {} extends T[N]["input"]
    ? [input?: T[N]["input"]]
    : [input: T[N]["input"]]
  : [input?: unknown];

export interface Server<T extends ToolMap = {}> {
  /** Registers a tool. Returns the server so calls can be chained. */
  tool<N extends string, I extends Schema | undefined = undefined, O extends Schema | undefined = undefined>(
    name: N,
    config: ToolConfig<I, O>,
  ): Server<T & { [K in N]: { input: I extends Schema ? InferInput<I> : Record<string, never> } }>;

  /** Registers a resource. URIs with `{variables}` become resource templates. */
  resource<U extends string>(uri: U, config: ResourceConfig<U>): Server<T>;

  /** Registers a prompt template. */
  prompt<A extends Schema | undefined = undefined>(name: string, config: PromptConfig<A>): Server<T>;

  /**
   * Calls a tool in-process. Ideal for tests: no transport, no client.
   * When tools are registered by chaining, names and arguments are type-checked.
   */
  call<N extends ToolName<T>>(name: N, ...args: CallArgs<T, N>): Promise<CallToolResult>;

  /** Handles one JSON-RPC message (or a batch). Returns nothing for notifications. */
  handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;

  /** A Web-standard Streamable HTTP handler: `Bun.serve({ fetch: server.fetch })`. */
  fetch(request: Request): Promise<Response>;

  /** Starts the server over stdio (default) or HTTP. */
  serve(options?: ServeOptions): Promise<Running>;
}
