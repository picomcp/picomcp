/**
 * Translations may change prose, never code. These checks keep every
 * translated page structurally identical to its English reference.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGS, UI } from "../site/i18n.ts";

const ORDER = ["index", "quickstart", "clients", "tools", "resources", "prompts", "schemas", "transports", "testing", "deploy", "api", "protocol", "agents"];
const README_LANGS = LANGS.slice(1).map((l) => l.code);

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const codeBlocks = (md: string) => md.match(/```[\s\S]*?```/g) ?? [];
const headings = (md: string) => md.replace(/```[\s\S]*?```/g, "").match(/^#{2,3} .+$/gm) ?? [];
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

function frontmatter(md: string) {
  const block = md.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
  return Object.fromEntries(block.split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
}

describe.each(LANGS.slice(1).map((l) => l.code))("docs in %s", (code) => {
  it.each(ORDER)("%s.md mirrors the English page", (slug) => {
    const path = `site/i18n/${code}/docs/${slug}.md`;
    expect(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`).toBe(true);
    const en = read(`site/docs/${slug}.md`);
    const tr = read(path);

    const meta = frontmatter(tr);
    expect(meta.title, "title").toBeTruthy();
    expect(meta.description, "description").toBeTruthy();
    expect(meta.group, "group").toBeTruthy();

    // Code is never translated.
    expect(codeBlocks(tr)).toEqual(codeBlocks(en));
    // Same outline: one translated heading per English heading, same levels.
    expect(headings(tr).map((h) => h.split(" ")[0])).toEqual(headings(en).map((h) => h.split(" ")[0]));
    // Same links to other pages and to external sites.
    const links = (md: string) => [...md.matchAll(/\]\(((?:\/|https?:)[^)]+)\)/g)].map((m) => m[1]).sort();
    expect(links(tr)).toEqual(links(en));
    // In-page anchors point at headings that exist in the translation.
    const ids = new Set(headings(tr).map((h) => slugify(h.replace(/^#+ /, ""))));
    for (const [, anchor] of tr.matchAll(/\]\(#([^)]+)\)/g)) expect(ids, `#${anchor}`).toContain(anchor);
  });

  it("uses one group name per English group", () => {
    const groups = (dir: string) => ORDER.map((slug) => frontmatter(read(`${dir}/${slug}.md`)).group);
    const en = groups("site/docs");
    const tr = groups(`site/i18n/${code}/docs`);
    const pairs = new Map<string, string>();
    en.forEach((g, i) => {
      if (pairs.has(g!)) expect(tr[i], `group of ${ORDER[i]}`).toBe(pairs.get(g!));
      else pairs.set(g!, tr[i]!);
    });
    expect(new Set(tr).size).toBe(new Set(en).size);
  });
});

describe("interface strings", () => {
  it("are complete in every language", () => {
    const keys = Object.keys(UI.en!).sort();
    for (const lang of LANGS) expect(Object.keys(UI[lang.code]!).sort(), lang.code).toEqual(keys);
  });
});

describe("READMEs", () => {
  it.each(README_LANGS)("README.%s.md keeps every code block of README.md", (code) => {
    const path = `README.${code}.md`;
    expect(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`).toBe(true);
    expect(codeBlocks(read(path))).toEqual(codeBlocks(read("README.md")));
  });

  it("all link to each other", () => {
    for (const file of ["README.md", ...README_LANGS.map((c) => `README.${c}.md`)]) {
      const text = read(file);
      for (const code of README_LANGS) expect(text, `${file} → README.${code}.md`).toContain(`README.${code}.md`);
    }
  });
});
