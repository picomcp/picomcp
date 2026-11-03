# AGENTS.md

Instructions for AI coding agents working on the picomcp repository. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md), which says the same things at more length.

## What this project is

picomcp is a zero-dependency TypeScript framework for building MCP (Model Context Protocol) servers. Its value is being **small, correct and typed**. Every change is judged against those three words, in that order of fragility.

## Commands

```sh
npm install           # once
npm run check         # everything CI runs: typecheck, tests, build, size budget, package lint
npm test              # vitest: unit, interop with the official SDK, docs search
npm run typecheck     # tsc on the repo, then tsc on src/ with isolatedDeclarations
npm run build         # tsdown → dist/index.js, dist/index.d.ts, dist/cli.js
npm run size          # fails if dist/index.js exceeds the gzip budget
npm run site          # builds the docs site into site/dist
npm run site:dev      # rebuilds on change, serves on http://localhost:4321
```

Run `npm run check` before you say a task is done. Report its real output.

## Map

| Path | What lives there |
| --- | --- |
| `src/server.ts` | `pico()`: registration, JSON-RPC dispatch, tool/resource/prompt handling |
| `src/types.ts` | Every public type, including the inlined Standard Schema interfaces |
| `src/schema.ts` | Validation and JSON Schema extraction via Standard JSON Schema |
| `src/content.ts` | Content helpers and return-value normalisation |
| `src/http.ts` | The Web-standard Streamable HTTP handler (`server.fetch`) |
| `src/listen.ts` | `serve({ http })` on Bun, Deno or Node |
| `src/stdio.ts` | `serve()` over stdin/stdout |
| `src/cli.ts` | `picomcp init`. Node-only, not part of the library bundle |
| `test/` | `server.test.ts` (unit + types), `interop.test.ts` (official SDK client), `search.test.ts` (docs search), `docs-package.test.ts` (`picomcp-docs`) |
| `site/` | Docs generator (`build.ts`), pages (`docs/*.md`), assets, Shiki theme |
| `examples/` | Runnable servers. Keep them working: they are documentation |
| `packages/docs/` | `picomcp-docs`, the docs as an MCP server. Published to npm on its own, depends on `picomcp` from npm |

## Hard rules

These are not style preferences. A change that breaks one will not be merged.

1. **No runtime dependencies.** `dependencies` in `package.json` stays empty. Dev dependencies are fine.
2. **Size budget.** `dist/index.js` must stay under the gzip budget in `scripts/size.ts`. If a feature needs more, say so explicitly in the PR; do not raise the budget silently.
3. **Runtime-agnostic core.** Nothing in `src/` except `src/cli.ts` may import `node:*` modules or rely on Node globals at import time. `src/` typechecks with `"types": []` to enforce this. Runtime-specific code goes behind feature detection (see `listen.ts`).
4. **Erasable TypeScript only.** No enums, namespaces with values, parameter properties or decorators. Node runs the source directly with type stripping, and `erasableSyntaxOnly` enforces it.
5. **Explicit types on exports.** `isolatedDeclarations` is on for `src/`. Annotate return types of exported functions.
6. **The public API is `src/index.ts`.** Anything not exported there is internal. Adding an export is an API change: it needs docs and a changelog entry.
7. **Interop tests stay green.** `test/interop.test.ts` drives picomcp with the official SDK client over stdio and HTTP. If it fails, the change is wrong, not the test.
8. **Follow the MCP spec.** When behaviour is specified, match it and cite the section in a comment where it is not obvious. Target version: the first entry of `PROTOCOL_VERSIONS`.

## When you change behaviour

- Add or update a test in `test/server.test.ts`. Type-level behaviour gets an `expectTypeOf` or `@ts-expect-error` test.
- Update the docs page in `site/docs/` that describes it, and `site/docs/api.md` if a signature changed.
- Update `site/docs/protocol.md` if protocol coverage changed.
- Add an entry under `## Unreleased` in `CHANGELOG.md`.
- If the README shows the changed API, update it.

## Style

- Formatting: 2 spaces, double quotes, semicolons, trailing commas, 140 columns. Match the surrounding code.
- Prefer small closures over classes. `McpError` is the only class, because `instanceof` is useful for it.
- Error messages are read by models and developers. Say what went wrong and how to fix it: `picomcp: invalid tool name "x y" (use 1-128 letters, digits, _ . -)`.
- Library errors at registration time throw `TypeError` with a `picomcp:` prefix. Errors at call time become tool errors or JSON-RPC errors, never crashes.
- Comments explain why, not what. JSDoc on every export, with an `@example` where it helps.

## Docs

- Pages are Markdown with `title`, `description` and `group` frontmatter. A new page must be added to `ORDER` in `site/build.ts`.
- Links between pages are site-absolute without extension: `[Tools](/docs/tools)`.
- Every code sample must be correct against the current API. Prefer samples that could be pasted into a project.
- Write plainly, in short sentences, for a developer who is busy.

## Do not

- Do not add a dependency, a build step or a config file to save a few lines.
- Do not commit `dist/` or `site/dist/`.
- Do not edit `CHANGELOG.md` entries of released versions.
- Do not publish, tag or push releases. Maintainers do that.
