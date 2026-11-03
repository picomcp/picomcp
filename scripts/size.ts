/**
 * Size budget for the published bundle. Fails CI when picomcp stops being pico.
 *
 *   node scripts/size.ts
 */
import { readFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";

const BUDGET_GZIP = 4.5 * 1024;

const code = readFileSync(new URL("../dist/index.js", import.meta.url));
const gzip = gzipSync(code, { level: 9 }).length;
const brotli = brotliCompressSync(code).length;
const kb = (n: number) => `${(n / 1024).toFixed(2)} kB`;

console.log(`dist/index.js  min ${kb(code.length)}  gzip ${kb(gzip)}  brotli ${kb(brotli)}  (budget ${kb(BUDGET_GZIP)} gzip)`);

if (gzip > BUDGET_GZIP) {
  console.error(`Size budget exceeded by ${kb(gzip - BUDGET_GZIP)}.`);
  process.exit(1);
}
