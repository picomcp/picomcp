# Contributing to picomcp

Thanks for helping. picomcp is small on purpose, so the most useful contributions are often bug reports, sharper docs, better error messages and tests. New features are welcome too, when they fit.

## Ways to help

- **Report a bug.** Open an issue with the smallest server that reproduces it, the client you used and what you expected. A failing test is even better.
- **Improve the docs.** Every page has an *Edit on GitHub* link. Typos, unclear sentences and missing examples are all worth a PR.
- **Propose a feature.** Open an issue before writing code, so we can agree on the API first. See [What gets merged](#what-gets-merged).
- **Answer questions** in issues and discussions.

## Development setup

You need Node 22.18+ (it runs TypeScript directly). Bun is optional, for running the examples with it.

```sh
git clone https://github.com/picomcp/picomcp
cd picomcp
npm install
npm run check
```

`npm run check` runs everything CI runs:

| Step | Command | What it checks |
| --- | --- | --- |
| Types | `npm run typecheck` | The repo, then `src/` alone with `isolatedDeclarations` and no Node types |
| Tests | `npm test` | Unit tests, type tests, interop with the official SDK, docs search |
| Build | `npm run build` | The bundle and its type declarations |
| Size | `npm run size` | `dist/index.js` stays under the gzip budget |
| Package | `npm run lint:pkg` | `publint` and `arethetypeswrong` on the packed tarball |

For the docs site:

```sh
npm run site:dev   # http://localhost:4321, rebuilds when site/ or README.md change
```

## Making a change

1. Fork the repository and create a branch from `main`.
2. Make your change, with tests. Keep the pull request focused on one thing.
3. Update the docs in `site/docs/` if behaviour or API changed.
4. Add a line under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md).
5. Run `npm run check`.
6. Open a pull request and fill in the template.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): `feat: add completions`, `fix(http): answer 400 on bad JSON`, `docs: explain prompt arguments`. It keeps the history readable and the changelog easy to write.

## What gets merged

picomcp has a few constraints that shape every decision. They are written down so you do not waste time on a PR that cannot land.

- **Zero runtime dependencies.** Always.
- **A size budget.** The bundle must stay under the gzip budget in `scripts/size.ts`. A feature that costs a lot of bytes needs a strong case.
- **Runtime-agnostic.** The core runs on Node, Bun, Deno and Workers. No `node:*` imports in `src/` outside the CLI.
- **The spec decides.** Behaviour follows the [MCP specification](https://modelcontextprotocol.io/specification/latest). Where the spec is silent, we choose what is least surprising for both the developer and the model.
- **Types are part of the API.** Inference must keep working. Type regressions are bugs.
- **Small API surface.** One obvious way to do each thing. A new option needs to earn its place.

Good candidates: protocol features from [Protocol coverage](https://picomcp.github.io/picomcp/docs/protocol) that can be added cheaply, better errors, runtime compatibility fixes, performance, tests.

Unlikely to be merged: plugin systems, middleware frameworks, built-in auth providers, adapters for specific frameworks (the `fetch` handler already covers them), anything that adds a dependency.

## Working with AI agents

Agents are welcome contributors. [AGENTS.md](AGENTS.md) holds the rules they need, and `CLAUDE.md` imports it. If you use an agent, you are still the author: review its changes and make sure `npm run check` passes before you open the PR.

## Releasing

Maintainers only:

1. Move the `## Unreleased` entries in `CHANGELOG.md` under a new version heading.
2. Bump the version in `package.json`, `jsr.json` and `src/cli.ts`. A test checks that they match.
3. Commit, tag `vX.Y.Z` and push the tag. The release workflow publishes to npm and JSR with provenance.

## Code of conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By taking part, you agree to uphold it.
