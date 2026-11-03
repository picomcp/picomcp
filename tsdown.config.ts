import { defineConfig } from "tsdown";

export default defineConfig([
  {
    // The library: runtime-agnostic, so no Node built-ins may leak in.
    entry: ["src/index.ts"],
    format: "esm",
    platform: "neutral",
    target: "es2022",
    dts: true,
    tsconfig: "tsconfig.lib.json",
    minify: true,
    clean: false,
  },
  {
    entry: ["src/cli.ts"],
    format: "esm",
    platform: "node",
    target: "node22",
    fixedExtension: false,
    dts: false,
    minify: true,
    clean: false,
  },
]);
