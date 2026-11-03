import type { Infer, InferInput, JsonSchema, Schema, StandardSchemaV1 } from "./types.ts";

const EMPTY_OBJECT: JsonSchema = { type: "object", properties: {} };

/**
 * Attaches a JSON Schema to a Standard Schema that cannot produce one itself.
 *
 * @example
 * tool("x", { input: withJsonSchema(mySchema, { type: "object", properties: {} }), run })
 */
export function withJsonSchema<S extends Schema>(
  schema: S,
  jsonSchema: JsonSchema,
  output: JsonSchema = jsonSchema,
): StandardSchemaV1<InferInput<S>, Infer<S>> {
  const std = schema["~standard"];
  return { "~standard": { ...std, validate: std.validate, jsonSchema: { input: () => jsonSchema, output: () => output } } };
}

/** Resolves the JSON Schema of a Standard Schema through Standard JSON Schema. */
export function toJsonSchema(schema: Schema | undefined, mode: "input" | "output"): JsonSchema {
  if (!schema) return EMPTY_OBJECT;
  const converter = schema["~standard"].jsonSchema;
  if (!converter) {
    throw new TypeError(
      `picomcp: the ${schema["~standard"].vendor} schema does not implement Standard JSON Schema. ` +
        "Wrap it with withJsonSchema(schema, jsonSchema) or use Zod 4, ArkType, or Valibot's toStandardJsonSchema().",
    );
  }
  const { $schema: _, ...json } = converter[mode]({ target: "draft-2020-12" });
  return json;
}

/** Validates a value. Returns the parsed value, or a readable error message. */
export async function validate<S extends Schema>(
  schema: S | undefined,
  value: unknown,
): Promise<{ ok: true; value: any } | { ok: false; message: string }> {
  if (!schema) return { ok: true, value: value ?? {} };
  const result = await schema["~standard"].validate(value ?? {});
  if (!result.issues) return { ok: true, value: result.value };
  return { ok: false, message: result.issues.map(formatIssue).join("\n") };
}

function formatIssue(issue: StandardSchemaV1.Issue): string {
  const path = issue.path?.map((p) => String(typeof p === "object" ? p.key : p)).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
