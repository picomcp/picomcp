# Changelog

All notable changes to picomcp are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## Unreleased

## 0.1.0

First release.

- `pico()` server factory with chainable `.tool()`, `.resource()` and `.prompt()`.
- Tools: Standard Schema input validation, `outputSchema` and `structuredContent`, annotations, return-value normalisation, errors as tool results.
- Resources: static resources and RFC 6570 templates (`{var}`, `{+var}`) with typed parameters.
- Prompts: arguments derived from schemas, string or message results.
- Cancellation through `AbortSignal`, with no response for cancelled requests.
- Transports: stdio with stdout protection, Streamable HTTP in stateless JSON mode, `server.fetch` and `server.handle`.
- HTTP origin checks against DNS rebinding, CORS for allowed origins.
- Type-checked `server.call()` for in-process tests.
- `picomcp init` CLI.
- MCP protocol versions `2025-11-25`, `2025-06-18`, `2025-03-26` and `2024-11-05`.
