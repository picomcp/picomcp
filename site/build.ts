/**
 * Static site generator for the picomcp docs — no framework, one file.
 *
 *   node site/build.ts            build into site/dist
 *   node site/build.ts --serve    build, then serve on http://localhost:4321
 *
 * Env: SITE_BASE (default "/"), SITE_URL (absolute URL of the site, for llms.txt and the sitemap).
 *
 * English pages live in site/docs and are the reference. Translations live in
 * site/i18n/<lang>/docs with the same file names; a missing translation falls
 * back to the English page.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { Marked, type Tokens } from "marked";
import { createHighlighter } from "shiki";
import { siClaude, siCursor, siGithubcopilot, siJetbrains, siModelcontextprotocol, siWindsurf, siZedindustries } from "simple-icons";
import { LANGS, UI, type Lang, type Strings } from "./i18n.ts";
import { dark, light } from "./theme.ts";

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SITE, "..");
const OUT = join(SITE, "dist");
const BASE = (process.env.SITE_BASE ?? "/").replace(/\/?$/, "/");
const SITE_URL = (process.env.SITE_URL ?? "https://picomcp.github.io/picomcp").replace(/\/$/, "");
const REPO = "https://github.com/picomcp/picomcp";
const EN = LANGS[0]!;

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
const bundle = join(ROOT, "dist/index.js");
const GZIP_KB = existsSync(bundle) ? (gzipSync(readFileSync(bundle), { level: 9 }).length / 1024).toFixed(1) : "4";

export const ORDER = ["index", "quickstart", "clients", "tools", "resources", "prompts", "schemas", "transports", "testing", "deploy", "api", "protocol", "agents"];

// ─── Paths ───────────────────────────────────────────────────────────────────

/** "" for English, "fr/" for French… */
const prefix = (lang: Lang) => (lang.code === "en" ? "" : `${lang.code}/`);
/** Site-relative path of a docs page, e.g. "docs/tools" or "fr/docs/". */
const pagePath = (lang: Lang, slug: string) => `${prefix(lang)}${slug === "index" ? "docs/" : `docs/${slug}`}`;
const sourceFile = (lang: Lang, slug: string) => (lang.code === "en" ? `site/docs/${slug}.md` : `site/i18n/${lang.code}/docs/${slug}.md`);

// ─── Content ─────────────────────────────────────────────────────────────────

interface Page {
  slug: string;
  lang: Lang;
  title: string;
  description: string;
  group: string;
  markdown: string;
  path: string;
  url: string;
  mdUrl: string;
  source: string;
  translated: boolean;
}

function parse(file: string) {
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file} has no frontmatter`);
  const meta = Object.fromEntries(match[1]!.split("\n").map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]));
  return { meta, markdown: raw.slice(match[0].length).trim() };
}

function readPages(lang: Lang): Page[] {
  if (lang.code === "en") {
    const unknown = readdirSync(join(SITE, "docs"))
      .map((f) => f.replace(/\.md$/, ""))
      .filter((s) => !ORDER.includes(s));
    if (unknown.length) throw new Error(`Add these pages to ORDER in site/build.ts: ${unknown.join(", ")}`);
  }
  return ORDER.map((slug) => {
    let file = join(ROOT, sourceFile(lang, slug));
    const translated = lang.code !== "en" && existsSync(file);
    if (!translated) file = join(ROOT, sourceFile(EN, slug));
    const { meta, markdown } = parse(file);
    const path = pagePath(lang, slug);
    return {
      slug,
      lang,
      title: meta.title!,
      description: meta.description!,
      group: meta.group!,
      markdown,
      path,
      url: BASE + path,
      mdUrl: `${BASE}${prefix(lang)}docs/${slug}.md`,
      source: translated || lang.code === "en" ? sourceFile(lang, slug) : sourceFile(EN, slug),
      translated,
    };
  });
}

// ─── Markdown ────────────────────────────────────────────────────────────────

const highlighter = await createHighlighter({ themes: [light, dark], langs: ["typescript", "shellscript", "json", "markdown"] });
const LANG_ALIASES: Record<string, string> = { ts: "typescript", sh: "shellscript", json: "json", md: "markdown" };
const highlight = (code: string, lang: string) =>
  highlighter.codeToHtml(code, { lang: LANG_ALIASES[lang] ?? "text", themes: { light: "blueprint-light", dark: "blueprint-dark" }, defaultColor: false });

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Heading ids keep letters of every script, so Russian, Chinese and Japanese headings get anchors too. */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
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

/** Resolves a site-absolute link. Docs links stay in the page's language. */
function siteLink(href: string, lang: Lang, absolute = false) {
  if (!href.startsWith("/")) return href;
  const root = absolute ? `${SITE_URL}/` : BASE;
  const path = href.slice(1);
  return root + (path.startsWith("docs") ? prefix(lang) : "") + path;
}

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
        return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="#">#</a></h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        return `<figure class="code"><figcaption class="code-head"><span class="label">${escapeHtml(lang || "text")}</span><button type="button" class="copy" data-copy="code">${escapeHtml(UI[page.lang.code]!.copy)}</button></figcaption>${highlight(text, lang ?? "")}</figure>\n`;
      },
      link({ href, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:/.test(href);
        return `<a href="${escapeHtml(siteLink(href, page.lang))}"${external ? ' rel="noopener" target="_blank"' : ""}>${inner}</a>`;
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

const ICON = `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" fill="none" stroke="var(--cobalt)" stroke-width="2"></rect><rect x="7" y="7" width="8" height="8" fill="var(--cobalt)"></rect></svg>`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><rect width="22" height="22" fill="#f4f6fa"/><rect x="2" y="2" width="18" height="18" fill="none" stroke="#1d3bff" stroke-width="2.4"/><rect x="7" y="7" width="8" height="8" fill="#1d3bff"/></svg>')}`;
const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const GLOBE_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.7 8h12.6M8 1.7c-2.2 2.4-2.2 10.2 0 12.6M8 1.7c2.2 2.4 2.2 10.2 0 12.6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

/** `paths` maps every language to the equivalent page, for hreflang and the language menu. */
type Alternates = (lang: Lang) => string;

function head(lang: Lang, t: Strings, title: string, description: string, path: string, alternates: Alternates) {
  const fonts = ["family=Archivo:wdth,wght@62..125,300..900", "family=JetBrains+Mono:wght@400;500;600", lang.fonts].filter(Boolean).join("&");
  const client = { loading: t.loading, noResults: t.noResults, tryOther: t.tryOther, pages: t.pages, copied: t.copied, pressCopy: t.pressCopy };
  return `<!doctype html>
<html lang="${lang.hreflang}" data-base="${BASE}" data-search="${BASE}${prefix(lang)}search.json">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${SITE_URL}/${path}">
${LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${SITE_URL}/${alternates(l)}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/${alternates(EN)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang.hreflang.replace("-", "_")}">
<meta property="og:image" content="${SITE_URL}/assets/social-preview.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f4f6fa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1230" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${FAVICON}">
<link rel="alternate" type="text/plain" title="llms.txt" href="${BASE}llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<link rel="stylesheet" href="${BASE}assets/style.css">
<script>try{const t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch{}</script>
<script type="application/json" id="ui">${JSON.stringify(client).replace(/</g, "\\u003c")}</script>
<script type="module" src="${BASE}assets/app.js"></script>
</head>
<body>
<a class="skip" href="#main">${escapeHtml(t.skip)}</a>`;
}

function topbar(lang: Lang, t: Strings, current: "home" | "docs" | "agents", alternates: Alternates) {
  const cur = (k: string) => (k === current ? ' aria-current="page"' : "");
  const menu = LANGS.map(
    (l) => `<li><a href="${BASE}${alternates(l)}" hreflang="${l.hreflang}" lang="${l.hreflang}"${l === lang ? ' aria-current="true"' : ""}>${escapeHtml(l.label)}</a></li>`,
  ).join("");
  return `<header class="topbar band"><div class="wrap">
  <a class="brand" href="${BASE}${prefix(lang)}">${ICON}<b>picomcp</b><span class="ver">v${pkg.version}</span></a>
  <nav class="topnav" aria-label="Main">
    <a class="docs-link" href="${BASE}${pagePath(lang, "index")}"${cur("docs")}>${escapeHtml(t.docs)}</a>
    <a class="hide-sm" href="${BASE}${pagePath(lang, "agents")}"${cur("agents")}>${escapeHtml(t.agents)}</a>
    <a class="hide-sm" href="${REPO}" rel="noopener">GitHub ↗</a>
    <button type="button" class="search-btn" data-search aria-label="${escapeHtml(t.searchLabel)}">${SEARCH_ICON}<span>${escapeHtml(t.searchDocs)}</span><kbd>⌘K</kbd></button>
    <details class="lang-menu">
      <summary class="icon-btn" aria-label="${escapeHtml(t.language)}">${GLOBE_ICON}<span class="lang-code">${lang.code.toUpperCase()}</span></summary>
      <ul>${menu}</ul>
    </details>
    <button type="button" class="icon-btn" id="theme" aria-label="${escapeHtml(t.themeToggle)}">
      <svg class="theme-light" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      <svg class="theme-dark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  </nav>
</div></header>`;
}

function footer(lang: Lang, t: Strings) {
  return `<footer class="footer band" style="border-bottom:0"><div class="wrap label">
  <span>picomcp · ${escapeHtml(t.license)} · ${escapeHtml(t.trademarks)}</span>
  <nav aria-label="Footer"><a href="${BASE}llms.txt">llms.txt</a><a href="https://www.npmjs.com/package/picomcp" rel="noopener">npm</a><a href="https://jsr.io/@picomcp/picomcp" rel="noopener">JSR</a><a href="${REPO}" rel="noopener">GitHub</a></nav>
</div></footer>
<div class="cmdk" id="cmdk" hidden>
  <div class="cmdk-backdrop" data-close></div>
  <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(t.searchLabel)}">
    <div class="cmdk-field">${SEARCH_ICON}<input id="cmdk-q" type="search" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" placeholder="${escapeHtml(t.searchPlaceholder)}" autocomplete="off" spellcheck="false" lang="${lang.hreflang}"><kbd>esc</kbd></div>
    <ul class="cmdk-list" id="cmdk-list" role="listbox" aria-label="${escapeHtml(t.results)}"></ul>
    <div class="cmdk-foot"><span class="nav-hint"><kbd>↑</kbd> <kbd>↓</kbd> ${escapeHtml(t.navigate)}</span><span><kbd>↵</kbd> ${escapeHtml(t.open)}</span><span class="fuzzy">${escapeHtml(t.typoTolerant)}</span></div>
  </div>
</div>
</body>
</html>
`;
}

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
  const t = UI[page.lang.code]!;
  const { html, toc } = render(page);
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const nav = sidebar(pages, page);
  const alternates: Alternates = (l) => pagePath(l, page.slug);
  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="${escapeHtml(t.onThisPage)}"><span class="label">${escapeHtml(t.onThisPage)}</span><ul>${toc
        .map((h) => `<li><a href="#${h.id}"${h.depth === 3 ? ' class="sub"' : ""}>${escapeHtml(h.text)}</a></li>`)
        .join("")}</ul></nav>`
    : "";
  const notice =
    page.lang.code !== "en"
      ? `<p class="translated">${escapeHtml(t.translated).replace("{link}", `<a href="${BASE}${pagePath(EN, page.slug)}" hreflang="en">${escapeHtml(t.englishVersion)}</a>`)}</p>`
      : "";
  return `${head(page.lang, t, `${page.title} · picomcp`, page.description, page.path, alternates)}
${topbar(page.lang, t, page.slug === "agents" ? "agents" : "docs", alternates)}
<div class="docs">
  <details class="mobile-nav"><summary>${escapeHtml(t.menu)} · ${escapeHtml(page.title)}</summary><nav class="sidebar" aria-label="Docs">${nav}</nav></details>
  <nav class="sidebar" aria-label="Docs">${nav}</nav>
  <main class="doc" id="main">
    <header class="doc-head">
      <span class="label">${escapeHtml(page.group)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p>${escapeHtml(page.description)}</p>
      <div class="page-actions">
        <button type="button" data-copy="markdown" data-src="${page.mdUrl}">${escapeHtml(t.copyMarkdown)}</button>
        <a href="${page.mdUrl}">${escapeHtml(t.viewMd)}</a>
        <a href="${REPO}/edit/main/${page.source}" rel="noopener">${escapeHtml(t.editGithub)}</a>
      </div>
      ${notice}
    </header>
    <article class="prose">${html}</article>
    <nav class="pager" aria-label="Pagination">
      ${prev ? `<a href="${prev.url}"><span class="label">← ${escapeHtml(t.previous)}</span><b>${escapeHtml(prev.title)}</b></a>` : ""}
      ${next ? `<a class="next" href="${next.url}"><span class="label">${escapeHtml(t.next)} →</span><b>${escapeHtml(next.title)}</b></a>` : ""}
    </nav>
  </main>
  ${tocHtml}
</div>
${footer(page.lang, t)}`;
}

const HERO_CODE = `import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve(); // stdio — or .serve({ http: 3000 })`;

const CLIENTS: { name: string; path: string }[] = [
  { name: "Claude", path: siClaude.path },
  { name: "Claude Code", path: siClaude.path },
  { name: "Cursor", path: siCursor.path },
  { name: "GitHub Copilot", path: siGithubcopilot.path },
  { name: "Windsurf", path: siWindsurf.path },
  { name: "Zed", path: siZedindustries.path },
  { name: "JetBrains", path: siJetbrains.path },
];

/** Wraps API names in <code> inside translated sentences. */
const codeify = (s: string) => escapeHtml(s).replace(/(server\.fetch|server\.handle|llms\.txt|\.md\b|fetch)/g, '<code class="mono">$1</code>');

function landing(lang: Lang) {
  const t = UI[lang.code]!;
  const p = prefix(lang);
  const code = highlight(HERO_CODE, "ts");
  const spec = (key: keyof Strings["specs"], value: string) =>
    `<div class="spec"><span class="label">${escapeHtml(t.specs[key][0])}</span><b>${value}</b><small>${codeify(t.specs[key][1])}</small></div>`;
  const logo = (path: string) => `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
  return `${head(lang, t, t.metaTitle, t.metaDescription, p, prefix)}
${topbar(lang, t, "home", prefix)}
<main id="main">
  <section class="hero band grid-bg"><div class="wrap">
    <div class="tags"><span class="tag">${escapeHtml(t.heroTag)}</span><span class="tag">v${pkg.version} · MIT</span></div>
    <h1>${escapeHtml(t.heroTitle1)}<br><em>${escapeHtml(t.heroTitle2)}</em></h1>
    <div class="hero-foot">
      <p>${escapeHtml(t.heroLead)}</p>
      <div class="actions">
        <button type="button" class="btn" data-copy="npm i picomcp"><span class="prompt">$</span> npm i picomcp <span class="dim">${escapeHtml(t.copy.toUpperCase())}</span></button>
        <a class="btn primary" href="${BASE}${pagePath(lang, "quickstart")}">${escapeHtml(t.readDocs)}</a>
      </div>
    </div>
  </div></section>

  <section class="split band"><div class="wrap">
    <div class="sheet">
      <div class="sheet-head"><span class="label">server.ts</span><span class="label">${HERO_CODE.split("\n").length} ${escapeHtml(t.lines)}</span></div>
      ${code}
    </div>
    <ol class="notes">
      <li><span class="key">A</span><div><strong>${escapeHtml(t.noteA[0])}</strong><span><code class="mono">pico()</code> ${escapeHtml(t.noteA[1])}</span></div></li>
      <li><span class="key">B</span><div><strong>${escapeHtml(t.noteB[0])}</strong><span>${escapeHtml(t.noteB[1])}</span></div></li>
      <li><span class="key">C</span><div><strong>${escapeHtml(t.noteC[0])}</strong><span>${codeify(t.noteC[1])}</span></div></li>
    </ol>
  </div></section>

  <section class="section band grid-bg"><div class="wrap">
    <div class="section-head"><h2>${escapeHtml(t.specSheet)}</h2><span class="label">${escapeHtml(t.specFig)}</span></div>
    <div class="specs">
      ${spec("bundle", `${GZIP_KB} kB`)}
      ${spec("deps", "0")}
      ${spec("runtimes", "Node ≥ 22 · Bun · Deno · Workers")}
      ${spec("transports", "stdio · Streamable HTTP")}
      ${spec("schemas", "Zod · Valibot · ArkType")}
      ${spec("protocol", "MCP 2025-11-25")}
    </div>
  </div></section>

  <section class="section band"><div class="wrap">
    <div class="section-head"><h2>${escapeHtml(t.agentsTitle)}</h2><span class="label">${escapeHtml(t.agentsFig)}</span></div>
    <div class="agents-grid">
      <a href="${BASE}llms.txt"><code>/llms.txt</code><span>${codeify(t.agentsItems[0])}</span></a>
      <a href="${BASE}${p}llms-full.txt"><code>/${p}llms-full.txt</code><span>${codeify(t.agentsItems[1])}</span></a>
      <a href="${BASE}${p}docs/tools.md"><code>/${p}docs/*.md</code><span>${codeify(t.agentsItems[2])}</span></a>
      <a href="${BASE}${pagePath(lang, "agents")}"><code>AGENTS.md</code><span>${codeify(t.agentsItems[3])}</span></a>
    </div>
  </div></section>

  <section class="clients band"><div class="wrap">
    <span class="label">${escapeHtml(t.clientsLabel)}</span>
    <ul>${CLIENTS.map((c) => `<li>${logo(c.path)}<span>${c.name}</span></li>`).join("")}<li>${logo(siModelcontextprotocol.path)}<span>${escapeHtml(t.yourAgent)}</span></li></ul>
  </div></section>

  <section class="cta band"><div class="wrap">
    <h2>${escapeHtml(t.ctaTitle1)}<br>${escapeHtml(t.ctaTitle2)}</h2>
    <div class="cta-side">
      <button type="button" data-copy="npx picomcp init my-server">$ npx picomcp init my-server</button>
      <a href="${REPO}" rel="noopener">${escapeHtml(t.star)}</a>
    </div>
  </div></section>
</main>
${footer(lang, t)}`;
}

function notFound() {
  const t = UI.en!;
  return `${head(EN, t, "Not found · picomcp", t.notFoundText, "404.html", () => "")}
${topbar(EN, t, "docs", prefix)}
<main id="main" class="section band grid-bg"><div class="wrap">
  <div class="section-head"><h2>${escapeHtml(t.notFoundTitle)}</h2></div>
  <p>${escapeHtml(t.notFoundText)} <button type="button" class="btn" data-search>${escapeHtml(t.searchDocs)}</button></p>
  <p class="label">${LANGS.map((l) => `<a href="${BASE}${prefix(l)}docs/" lang="${l.hreflang}">${escapeHtml(l.label)}</a>`).join(" · ")}</p>
</div></main>
${footer(EN, t)}`;
}

// ─── Agent formats and SEO ───────────────────────────────────────────────────

const absoluteLinks = (md: string, lang: Lang) => md.replace(/\]\((\/[^)]*)\)/g, (_, href: string) => `](${siteLink(href, lang, true)})`);

const pageMarkdown = (page: Page) =>
  `# ${page.title}\nSource: ${SITE_URL}/${page.path}\n\n> ${page.description}\n\n${absoluteLinks(page.markdown.replace(/^# .+\n+/, ""), page.lang)}\n`;

function llmsTxt(pages: Page[]) {
  const groups = [...new Set(pages.map((p) => p.group))];
  return `# picomcp

> MCP servers, at pico scale. A zero-dependency TypeScript framework for Model Context Protocol servers. About 4 kB, typed from Zod/Valibot/ArkType schemas, runs on Node 22+, Bun, Deno and Workers, serves over stdio and Streamable HTTP.

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
${LANGS.slice(1)
  .map((l) => `- [Full documentation, ${l.label}](${SITE_URL}/${l.code}/llms-full.txt): translation`)
  .join("\n")}
- [Source code](${REPO}): the library is under 800 lines of TypeScript in src/, about half of it types and doc comments
`;
}

function sitemap() {
  const entry = (path: (l: Lang) => string) =>
    LANGS.map(
      (l) =>
        `  <url><loc>${SITE_URL}/${path(l)}</loc>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${SITE_URL}/${path(a)}"/>`).join("")}</url>`,
    ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[entry(prefix), ...ORDER.map((slug) => entry((l) => pagePath(l, slug)))].join("\n")}
</urlset>
`;
}

// ─── Build ───────────────────────────────────────────────────────────────────

function write(path: string, content: string) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function build() {
  const started = performance.now();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, "assets"), { recursive: true });
  for (const asset of readdirSync(join(SITE, "assets"))) copyFileSync(join(SITE, "assets", asset), join(OUT, "assets", asset));
  copyFileSync(join(ROOT, ".github/assets/social-preview.png"), join(OUT, "assets/social-preview.png"));

  let count = 0;
  const missing: string[] = [];
  for (const lang of LANGS) {
    const pages = readPages(lang);
    const p = prefix(lang);
    write(`${p}index.html`, landing(lang));
    for (const page of pages) {
      if (lang.code !== "en" && !page.translated) missing.push(`${lang.code}/${page.slug}`);
      write(page.slug === "index" ? `${p}docs/index.html` : `${p}docs/${page.slug}.html`, docPage(pages, page));
      write(`${p}docs/${page.slug}.md`, pageMarkdown(page));
      count++;
    }
    write(`${p}search.json`, JSON.stringify(pages.flatMap(sections)));
    write(`${p}llms-full.txt`, pages.map(pageMarkdown).join("\n---\n\n"));
    if (lang.code === "en") write("llms.txt", llmsTxt(pages));
  }
  write("404.html", notFound());
  write("sitemap.xml", sitemap());
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  write(".nojekyll", "");
  console.log(`Built ${count} pages in ${LANGS.length} languages into ${OUT} in ${Math.round(performance.now() - started)} ms (base ${BASE})`);
  if (missing.length) console.log(`Untranslated, English shown instead: ${missing.join(", ")}`);
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
    ".xml": "application/xml",
    ".png": "image/png",
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
