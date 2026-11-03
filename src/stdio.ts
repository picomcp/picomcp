import type { Running, Server } from "./types.ts";

/**
 * Serves newline-delimited JSON-RPC over stdin/stdout (Node, Bun, Deno).
 *
 * stdout is the protocol channel, so `console.log` and friends are redirected
 * to stderr: a stray log can no longer corrupt the stream.
 */
export async function serveStdio(handle: Server["handle"]): Promise<Running> {
  const proc = (globalThis as any).process;
  if (!proc?.stdin) throw new Error("picomcp: stdio needs process.stdin (Node, Bun or Deno). Use serve({ http }) or fetch instead.");

  console.log = console.info = console.debug = console.error;

  const write = (message: unknown) => proc.stdout.write(`${JSON.stringify(message)}\n`);
  let buffer = "";

  const onData = (chunk: string) => {
    buffer += chunk;
    let end: number;
    while ((end = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      let message: unknown;
      try {
        message = JSON.parse(line);
      } catch {
        write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
        continue;
      }
      handle(message).then((response) => response && write(response));
    }
  };

  proc.stdin.setEncoding("utf8");
  proc.stdin.on("data", onData);

  return {
    async close() {
      proc.stdin.off("data", onData);
      proc.stdin.pause();
    },
  };
}
