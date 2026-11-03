import type { Annotations, CallToolResult, ContentBlock } from "./types.ts";

/** A text content block. */
export const text = (text: string, annotations?: Annotations): ContentBlock => ({ type: "text", text, ...(annotations && { annotations }) });

/** An image content block. `data` is base64 or raw bytes. */
export const image = (data: string | Uint8Array, mimeType: string): ContentBlock => ({ type: "image", data: base64(data), mimeType });

/** An audio content block. `data` is base64 or raw bytes. */
export const audio = (data: string | Uint8Array, mimeType: string): ContentBlock => ({ type: "audio", data: base64(data), mimeType });

/** A link to a resource the client can read later. */
export const link = (uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock => ({
  type: "resource_link",
  uri,
  name,
  ...extra,
});

const CONTENT_TYPES = new Set(["text", "image", "audio", "resource_link", "resource"]);

const isBlock = (v: unknown): v is ContentBlock =>
  typeof v === "object" && v !== null && CONTENT_TYPES.has((v as { type?: unknown }).type as string);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Normalises whatever a tool returned into a `CallToolResult`. */
export function toResult(value: unknown, structured: boolean): CallToolResult {
  if (structured) {
    return { content: [text(JSON.stringify(value))], structuredContent: value as Record<string, unknown> };
  }
  if (value === undefined || value === null) return { content: [] };
  if (typeof value === "string") return { content: [text(value)] };
  if (isBlock(value)) return { content: [value] };
  if (Array.isArray(value) && value.length > 0 && value.every(isBlock)) return { content: value };
  if (isPlainObject(value) && Array.isArray(value.content) && value.content.every(isBlock)) {
    return value as unknown as CallToolResult;
  }
  return {
    content: [text(JSON.stringify(value))],
    ...(isPlainObject(value) && { structuredContent: value }),
  };
}

/** Base64-encodes bytes on every runtime, without Buffer. */
export function base64(data: string | Uint8Array): string {
  if (typeof data === "string") return data;
  let binary = "";
  for (let i = 0; i < data.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000) as unknown as number[]);
  }
  return btoa(binary);
}
