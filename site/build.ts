/**
 * Static site generator for picomcp.dev — no framework, one file.
 *
 *   node site/build.ts            build into site/dist
 *   node site/build.ts --serve    build, then serve on http://localhost:4321
 *
 * Env: SITE_BASE (default "/"), SITE_URL (absolute URL of the site, for llms.txt).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { Marked, type Tokens } from "marked";
import { createHighlighter } from "shiki";
import { dark, light } from "./theme.ts";

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SITE, "..");
const OUT = join(SITE, "dist");
const BASE = (process.env.SITE_BASE ?? "/").replace(/\/?$/, "/");
const SITE_URL = (process.env.SITE_URL ?? "https://picomcp.github.io/picomcp").replace(/\/$/, "");
const REPO = "https://github.com/picomcp/picomcp";

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string; description: string };
const bundle = join(ROOT, "dist/index.js");
const GZIP_KB = existsSync(bundle) ? (gzipSync(readFileSync(bundle), { level: 9 }).length / 1024).toFixed(1) : "4";

const ORDER = ["index", "quickstart", "clients", "tools", "resources", "prompts", "schemas", "transports", "testing", "deploy", "api", "protocol", "agents"];

// ─── Content ─────────────────────────────────────────────────────────────────

interface Page {
  slug: string;
  title: string;
  description: string;
  group: string;
  markdown: string;
  url: string;
  mdUrl: string;
}

function readPages(): Page[] {
  const files = readdirSync(join(SITE, "docs")).filter((f) => f.endsWith(".md"));
  const unknown = files.map((f) => f.slice(0, -3)).filter((s) => !ORDER.includes(s));
  if (unknown.length) throw new Error(`Add these pages to ORDER in site/build.ts: ${unknown.join(", ")}`);
  return ORDER.map((slug) => {
    const raw = readFileSync(join(SITE, "docs", `${slug}.md`), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) throw new Error(`${slug}.md has no frontmatter`);
    const meta = Object.fromEntries(match[1]!.split("\n").map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]));
    const path = slug === "index" ? "docs/" : `docs/${slug}`;
    return {
      slug,
      title: meta.title!,
      description: meta.description!,
      group: meta.group!,
      markdown: raw.slice(match[0].length).trim(),
      url: BASE + path,
      mdUrl: `${BASE}docs/${slug}.md`,
    };
  });
}

// ─── Markdown ────────────────────────────────────────────────────────────────

const highlighter = await createHighlighter({ themes: [light, dark], langs: ["typescript", "shellscript", "json", "markdown"] });
const LANG: Record<string, string> = { ts: "typescript", sh: "shellscript", json: "json", md: "markdown" };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
const plain = (s: string) =>
  s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Turns a site-absolute docs link into a link under BASE, or an absolute URL. */
const siteLink = (href: string, absolute = false) => (href.startsWith("/") ? (absolute ? SITE_URL : BASE.slice(0, -1)) + href : href);

function render(page: Page) {
  const toc: { id: string; text: string; depth: number }[] = [];
  const used = new Set<string>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const html = this.parser.parseInline(tokens);
        if (depth === 1) return "";
        let id = slugify(text);
        while (used.has(id)) id += "-";
        used.add(id);
        if (depth <= 3) toc.push({ id, text: plain(text), depth });
        return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const language = LANG[lang ?? ""] ?? "text";
        const html = highlighter.codeToHtml(text, { lang: language, themes: { light: "blueprint-light", dark: "blueprint-dark" }, defaultColor: false });
        return `<figure class="code"><figcaption class="code-head"><span class="label">${escapeHtml(lang || "text")}</span><button type="button" class="copy" data-copy="code">Copy</button></figcaption>${html}</figure>\n`;
      },
      link({ href, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:/.test(href);
        return `<a href="${escapeHtml(siteLink(href))}"${external ? ' rel="noopener" target="_blank"' : ""}>${inner}</a>`;
      },
      table(token: Tokens.Table) {
        const cell = (c: Tokens.TableCell) => this.parser.parseInline(c.tokens);
        const head = token.header.map((c) => `<th>${cell(c)}</th>`).join("");
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join("")}</tr>`).join("\n");
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  return { html: marked.parse(page.markdown, { async: false }) as string, toc };
}

/** Splits a page into searchable sections, one per h2/h3. */
function sections(page: Page) {
  const out: { p: string; h: string; u: string; x: string }[] = [];
  let current = { p: page.title, h: page.title, u: page.url, x: page.description };
  const used = new Set<string>();
  for (const line of page.markdown.replace(/```[\s\S]*?```/g, (code) => code.replace(/^#/gm, "")).split("\n")) {
    const heading = line.match(/^(#{2,3}) (.+)$/);
    if (heading) {
      out.push(current);
      let id = slugify(heading[2]!);
      while (used.has(id)) id += "-";
      used.add(id);
      current = { p: page.title, h: plain(heading[2]!), u: `${page.url}#${id}`, x: "" };
    } else if (!line.startsWith("# ")) {
      current.x += ` ${line}`;
    }
  }
  out.push(current);
  return out.map((s) => ({ ...s, x: plain(s.x).slice(0, 1200) }));
}

// ─── Templates ───────────────────────────────────────────────────────────────

const ICON = `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--cobalt)"></rect><rect x="7" y="7" width="8" height="8" fill="var(--cobalt)"></rect></svg>`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><rect width="22" height="22" fill="#f4f6fa"/><rect x="2" y="2" width="18" height="18" fill="none" stroke="#1d3bff" stroke-width="2.4"/><rect x="7" y="7" width="8" height="8" fill="#1d3bff"/></svg>')}`;
const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function head(title: string, description: string, path: string) {
  return `<!doctype html>
<html lang="en" data-base="${BASE}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${SITE_URL}/${path}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#f4f6fa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1230" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${FAVICON}">
<link rel="alternate" type="text/plain" title="llms.txt" href="${BASE}llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${BASE}assets/style.css">
<script>try{const t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch{}</script>
<script type="module" src="${BASE}assets/app.js"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

function topbar(current: "home" | "docs" | "agents") {
  const cur = (k: string) => (k === current ? ' aria-current="page"' : "");
  return `<header class="topbar band"><div class="wrap">
  <a class="brand" href="${BASE}">${ICON}<b>picomcp</b><span class="ver">v${pkg.version}</span></a>
  <nav class="topnav" aria-label="Main">
    <a href="${BASE}docs/"${cur("docs")}>Docs</a>
    <a class="hide-sm" href="${BASE}docs/agents"${cur("agents")}>Agents</a>
    <a class="hide-sm" href="${REPO}" rel="noopener">GitHub ↗</a>
    <button type="button" class="search-btn" data-search aria-label="Search the docs">${SEARCH_ICON}<span>Search docs</span><kbd>⌘K</kbd></button>
    <button type="button" class="icon-btn" id="theme" aria-label="Toggle dark mode">
      <svg class="theme-light" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      <svg class="theme-dark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  </nav>
</div></header>`;
}

const palette = `<div class="cmdk" id="cmdk" hidden>
  <div class="cmdk-backdrop" data-close></div>
  <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search the docs">
    <div class="cmdk-field">${SEARCH_ICON}<input id="cmdk-q" type="search" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" placeholder="Search the docs… typos are fine" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div>
    <ul class="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results"></ul>
    <div class="cmdk-foot"><span class="nav-hint"><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span class="fuzzy">typo-tolerant</span></div>
  </div>
</div>`;

const footer = `<footer class="footer band" style="border-bottom:0"><div class="wrap label">
  <span>picomcp · MIT License</span>
  <nav aria-label="Footer"><a href="${BASE}llms.txt">llms.txt</a><a href="https://www.npmjs.com/package/picomcp" rel="noopener">npm</a><a href="https://jsr.io/@picomcp/picomcp" rel="noopener">JSR</a><a href="${REPO}" rel="noopener">GitHub</a></nav>
</div></footer>
${palette}
</body>
</html>
`;

function sidebar(pages: Page[], current: Page) {
  const groups = [...new Set(pages.map((p) => p.group))];
  return groups
    .map(
      (g) =>
        `<h2 class="label">${escapeHtml(g)}</h2><ul>${pages
          .filter((p) => p.group === g)
          .map((p) => `<li><a href="${p.url}"${p === current ? ' aria-current="page"' : ""}>${escapeHtml(p.title)}</a></li>`)
          .join("")}</ul>`,
    )
    .join("");
}

function docPage(pages: Page[], page: Page) {
  const { html, toc } = render(page);
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const nav = sidebar(pages, page);
  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="On this page"><span class="label">On this page</span><ul>${toc
        .map((t) => `<li><a href="#${t.id}"${t.depth === 3 ? ' class="sub"' : ""}>${escapeHtml(t.text)}</a></li>`)
        .join("")}</ul></nav>`
    : "";
  return `${head(`${page.title} · picomcp`, page.description, page.url.slice(BASE.length))}
${topbar(page.slug === "agents" ? "agents" : "docs")}
<div class="docs">
  <details class="mobile-nav"><summary>Menu · ${escapeHtml(page.title)}</summary><nav class="sidebar" aria-label="Docs">${nav}</nav></details>
  <nav class="sidebar" aria-label="Docs">${nav}</nav>
  <main class="doc" id="main">
    <header class="doc-head">
      <span class="label">${escapeHtml(page.group)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p>${escapeHtml(page.description)}</p>
      <div class="page-actions">
        <button type="button" data-copy="markdown" data-src="${page.mdUrl}">Copy as Markdown</button>
        <a href="${page.mdUrl}">View .md</a>
        <a href="${REPO}/edit/main/site/docs/${page.slug}.md" rel="noopener">Edit on GitHub</a>
      </div>
    </header>
    <article class="prose">${html}</article>
    <nav class="pager" aria-label="Pagination">
      ${prev ? `<a href="${prev.url}"><span class="label">← Previous</span><b>${escapeHtml(prev.title)}</b></a>` : ""}
      ${next ? `<a class="next" href="${next.url}"><span class="label">Next →</span><b>${escapeHtml(next.title)}</b></a>` : ""}
    </nav>
  </main>
  ${tocHtml}
</div>
${footer}`;
}

const HERO_CODE = `import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve(); // stdio — or .serve({ http: 3000 })`;

function landing() {
  const code = highlighter.codeToHtml(HERO_CODE, { lang: "typescript", themes: { light: "blueprint-light", dark: "blueprint-dark" }, defaultColor: false });
  const lines = HERO_CODE.split("\n").length;
  const title = "picomcp — MCP servers, at pico scale";
  return `${head(title, pkg.description, "")}
${topbar("home")}
<main id="main">
  <section class="hero band grid-bg"><div class="wrap">
    <div class="tags"><span class="tag">FIG. 01 — Model Context Protocol</span><span class="tag">v${pkg.version} · MIT</span></div>
    <h1>MCP servers,<br><em>at pico scale.</em></h1>
    <div class="hero-foot">
      <p>Give any LLM real tools in one file. Typed with your schema library, served over stdio or HTTP, running on Node, Bun, Deno and the edge.</p>
      <div class="actions">
        <button type="button" class="btn" data-copy="npm i picomcp"><span class="prompt">$</span> npm i picomcp <span class="dim">COPY</span></button>
        <a class="btn primary" href="${BASE}docs/quickstart">Read the docs →</a>
      </div>
    </div>
  </div></section>

  <section class="split band"><div class="wrap">
    <div class="sheet">
      <div class="sheet-head"><span class="label">server.ts</span><span class="label">${lines} lines</span></div>
      ${code}
    </div>
    <ol class="notes">
      <li><span class="key">A</span><div><strong>One factory</strong><span><code class="mono">pico()</code> returns a server. Chain tools, resources and prompts. No classes, no decorators, no config file.</span></div></li>
      <li><span class="key">B</span><div><strong>Schema in, types out</strong><span>Zod, Valibot or ArkType through Standard Schema. Typed handlers, generated JSON Schema, readable errors.</span></div></li>
      <li><span class="key">C</span><div><strong>Any transport</strong><span>stdio for desktop clients, Streamable HTTP for the web. A Web-standard <code class="mono">fetch</code> handler for everything else.</span></div></li>
    </ol>
  </div></section>

  <section class="section band grid-bg"><div class="wrap">
    <div class="section-head"><h2>Spec sheet</h2><span class="label">FIG. 02 — what ships in the box</span></div>
    <div class="specs">
      <div class="spec"><span class="label">Bundle</span><b>${GZIP_KB} kB</b><small>minified and gzipped, types included</small></div>
      <div class="spec"><span class="label">Dependencies</span><b>0</b><small>Standard Schema types are inlined</small></div>
      <div class="spec"><span class="label">Runtimes</span><b>Node ≥ 22 · Bun · Deno · Workers</b><small>no Node built-ins in the core</small></div>
      <div class="spec"><span class="label">Transports</span><b>stdio · Streamable HTTP</b><small>plus <code class="mono">server.fetch</code> and <code class="mono">server.handle</code></small></div>
      <div class="spec"><span class="label">Schemas</span><b>Zod · Valibot · ArkType</b><small>or any Standard Schema</small></div>
      <div class="spec"><span class="label">Protocol</span><b>MCP 2025-11-25</b><small>tested against the official SDK client</small></div>
    </div>
  </div></section>

  <section class="section band"><div class="wrap">
    <div class="section-head"><h2>Docs for agents too</h2><span class="label">FIG. 03 — machine-readable by default</span></div>
    <div class="agents-grid">
      <a href="${BASE}llms.txt"><code>/llms.txt</code><span>An index of every page, in the llms.txt format.</span></a>
      <a href="${BASE}llms-full.txt"><code>/llms-full.txt</code><span>The whole documentation in one Markdown file.</span></a>
      <a href="${BASE}docs/tools.md"><code>/docs/*.md</code><span>Add <span class="mono">.md</span> to any page URL to get its Markdown.</span></a>
      <a href="${BASE}docs/agents"><code>AGENTS.md</code><span>Rules to paste into your agent so it writes picomcp code right.</span></a>
    </div>
  </div></section>

  <section class="clients band"><div class="wrap">
    <span class="label">Plugs into any MCP client</span>
    <ul><li>Claude</li><li>Claude Code</li><li>Cursor</li><li>VS Code</li><li>Zed</li><li>Your agent</li></ul>
  </div></section>

  <section class="cta band"><div class="wrap">
    <h2>Ship a server<br>before lunch.</h2>
    <div class="cta-side">
      <button type="button" data-copy="npx picomcp init my-server">$ npx picomcp init my-server</button>
      <a href="${REPO}" rel="noopener">★ Star on GitHub →</a>
    </div>
  </div></section>
</main>
${footer}`;
}

function notFound() {
  return `${head("Not found · picomcp", "This page does not exist.", "404.html")}
${topbar("docs")}
<main id="main" class="section band grid-bg"><div class="wrap">
  <div class="section-head"><h2>404 — Not on the drawing</h2></div>
  <p>This page does not exist. <button type="button" class="btn" data-search>Search the docs</button></p>
</div></main>
${footer}`;
}

// ─── Agent formats ───────────────────────────────────────────────────────────

const absoluteLinks = (md: string) => md.replace(/\]\((\/[^)]*)\)/g, (_, href: string) => `](${siteLink(href, true)})`);

function llmsTxt(pages: Page[]) {
  const groups = [...new Set(pages.map((p) => p.group))];
  return `# picomcp

> ${pkg.description} About 4 kB, typed from Zod/Valibot/ArkType schemas, runs on Node 22+, Bun, Deno and Workers, serves over stdio and Streamable HTTP.

Install with \`npm i picomcp\`. Minimal server:

\`\`\`ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", { input: z.object({ city: z.string() }), run: ({ city }) => \`Sunny in \${city}\` })
  .serve();
\`\`\`

${groups
  .map(
    (g) =>
      `## ${g}\n\n${pages
        .filter((p) => p.group === g)
        .map((p) => `- [${p.title}](${SITE_URL}/docs/${p.slug}.md): ${p.description}`)
        .join("\n")}`,
  )
  .join("\n\n")}

## Optional

- [Full documentation](${SITE_URL}/llms-full.txt): every page in one file
- [Source code](${REPO}): the library is under 800 lines of TypeScript in src/, about half of it types and doc comments
`;
}

const pageMarkdown = (page: Page) => `# ${page.title}\nSource: ${SITE_URL}/${page.url.slice(BASE.length)}\n\n> ${page.description}\n\n${absoluteLinks(page.markdown.replace(/^# .+\n+/, ""))}\n`;

// ─── Build ───────────────────────────────────────────────────────────────────

function write(path: string, content: string) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function build() {
  const started = performance.now();
  const pages = readPages();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, "assets"), { recursive: true });
  for (const asset of readdirSync(join(SITE, "assets"))) copyFileSync(join(SITE, "assets", asset), join(OUT, "assets", asset));

  write("index.html", landing());
  write("404.html", notFound());
  for (const page of pages) {
    write(page.slug === "index" ? "docs/index.html" : `docs/${page.slug}.html`, docPage(pages, page));
    write(`docs/${page.slug}.md`, pageMarkdown(page));
  }
  write("search.json", JSON.stringify(pages.flatMap(sections)));
  write("llms.txt", llmsTxt(pages));
  write("llms-full.txt", `${pages.map(pageMarkdown).join("\n---\n\n")}`);
  write(".nojekyll", "");
  console.log(`Built ${pages.length} pages into ${OUT} in ${Math.round(performance.now() - started)} ms (base ${BASE})`);
}

build();

// ─── Dev server ──────────────────────────────────────────────────────────────

if (process.argv.includes("--serve")) {
  const TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
  };
  createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    if (BASE !== "/" && path.startsWith(BASE)) path = `/${path.slice(BASE.length)}`;
    const candidates = [path, `${path}.html`, join(path, "index.html")];
    const file = candidates.map((c) => join(OUT, c)).find((c) => c.startsWith(OUT) && existsSync(c) && extname(c));
    res.writeHead(file ? 200 : 404, { "content-type": TYPES[extname(file ?? ".html")] ?? "application/octet-stream" });
    res.end(readFileSync(file ?? join(OUT, "404.html")));
  }).listen(4321, () => console.log(`Serving on http://localhost:4321${BASE}`));
}
