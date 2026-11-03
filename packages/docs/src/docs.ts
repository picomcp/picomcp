/** Pure helpers over the docs text: no I/O, no dependencies, so they are easy to test. */

export interface Page {
  title: string;
  url: string;
  body: string;
}

/** Splits llms-full.txt into pages. Each page starts with a `# Title` line followed by `Source: <url>`. */
export function parse(text: string, site: string): Page[] {
  return text
    .split(/^(?=# [^\n]+\nSource: )/m)
    .map((chunk) => {
      const title = chunk.match(/^# (.+)$/m)?.[1]?.trim() ?? "";
      const url = chunk.match(/^Source: (.+)$/m)?.[1]?.trim() ?? site;
      return { title, url, body: chunk.trim() };
    })
    .filter((page) => page.title);
}

/** Ranks pages by query words: a word in the title is worth 10, each mention in the body 1 (at most 5 per word). */
export function search(all: Page[], query: string, limit = 5): Page[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  return all
    .map((page) => {
      const title = page.title.toLowerCase();
      const body = page.body.toLowerCase();
      const score = words.reduce((sum, w) => sum + (title.includes(w) ? 10 : 0) + Math.min(body.split(w).length - 1, 5), 0);
      return { page, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => hit.page);
}

/** Finds a page by exact title first, then by the page slug at the end of its URL. */
export function find(all: Page[], name: string): Page | undefined {
  const key = name.trim().toLowerCase().replace(/\.md$/, "");
  return (
    all.find((p) => p.title.toLowerCase() === key) ??
    all.find((p) => p.url.toLowerCase().replace(/\/$/, "").replace(/\.html$/, "").endsWith(`/${key}`))
  );
}
