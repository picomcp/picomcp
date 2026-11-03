#!/usr/bin/env node
/**
 * picomcp CLI — scaffolds a new MCP server.
 *
 *   npx picomcp init my-server
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import process from "node:process";

const VERSION = "0.1.2";

const HELP = `picomcp ${VERSION}

Usage
  picomcp init [dir]   Create a new MCP server in dir (default: current directory)
  picomcp --version    Print the version
  picomcp --help       Show this help
`;

const files = (name: string): Record<string, string> => ({
  "package.json": `${JSON.stringify(
    {
      name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: { start: "node main.ts", dev: "node --watch main.ts", test: "node --test" },
      dependencies: { picomcp: `^${VERSION}`, zod: "^4.0.0" },
      engines: { node: ">=22.18" },
    },
    null,
    2,
  )}\n`,
  "server.ts": `import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: ${JSON.stringify(name)}, version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => \`Hello, \${name}!\`,
  });
`,
  "main.ts": `import { server } from "./server.ts";

await server.serve();
`,
  "server.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
`,
  "tsconfig.json": `${JSON.stringify(
    {
      compilerOptions: {
        target: "es2022",
        module: "nodenext",
        strict: true,
        noEmit: true,
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        skipLibCheck: true,
      },
    },
    null,
    2,
  )}\n`,
  ".gitignore": "node_modules\n",
  "README.md": `# ${name}\n\nAn MCP server built with [picomcp](https://github.com/picomcp/picomcp).\n\n\`\`\`sh\nnpm install\nnpm test\nnpm start\n\`\`\`\n`,
});

function init(target = "."): void {
  const dir = resolve(target);
  const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "mcp-server";
  const plan = files(name);
  const clash = Object.keys(plan).filter((f) => existsSync(join(dir, f)));
  if (clash.length) {
    process.stderr.write(`picomcp: not overwriting existing files in ${dir}: ${clash.join(", ")}\n`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(plan)) writeFileSync(join(dir, file), content);

  const cd = target === "." ? "" : `  cd ${target}\n`;
  process.stdout.write(`\nCreated ${name} in ${dir}\n\nNext steps\n${cd}  npm install\n  npm test\n\nConnect it to Claude Code\n  claude mcp add ${name} -- node ${join(dir, "main.ts")}\n\n`);
}

const [command, arg] = process.argv.slice(2);
if (command === "init") init(arg);
else if (command === "--version" || command === "-v") process.stdout.write(`${VERSION}\n`);
else {
  process.stdout.write(HELP);
  if (command && command !== "--help" && command !== "-h") process.exit(1);
}
