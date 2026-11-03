// @ts-check
/**
 * Typo-tolerant full-text search for the docs. No dependencies, ~2 kB.
 *
 * - Exact words score highest, then prefixes (for the word being typed),
 *   then words within an edit distance of 1 (4–6 letters) or 2 (7+ letters).
 * - Edits are Damerau–Levenshtein (optimal string alignment): a swapped pair
 *   of letters ("tolos" → "tools") counts as one typo.
 * - Every query word must match a section; if none does, any-word matches
 *   are returned instead, so a search never comes back empty for one bad word.
 */

/** @typedef {{ p: string, h: string, u: string, x: string }} Doc */
/** @typedef {{ docs: Doc[], terms: Map<string, Map<number, number>>, vocab: string[] }} Index */

const WEIGHT = { heading: 4, page: 2, text: 1 };

/**
 * Lower-cases and strips Latin, Greek and Cyrillic accents ("é" → "e", "й" → "и"),
 * then recomposes, so Japanese voiced kana ("が") stay intact.
 * @param {string} s
 */
export const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const CJK_RUNS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu;

/**
 * Splits text into searchable terms, in any script. Chinese and Japanese have
 * no spaces between words, so their runs become single characters plus
 * overlapping pairs ("资源模板" → 资 源 模 板 资源 源模 模板).
 * @param {string} s
 * @returns {string[]}
 */
export function words(s) {
  /** @type {string[]} */
  const out = [];
  for (const token of normalize(s).match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (!CJK.test(token)) {
      out.push(token);
      continue;
    }
    for (const run of token.match(CJK_RUNS) ?? []) {
      if (!CJK.test(run)) {
        out.push(run);
        continue;
      }
      const chars = [...run];
      out.push(...chars);
      for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
    }
  }
  return out;
}

/** @param {string} term */
const isCjk = (term) => CJK.test(term);

/**
 * @param {Doc[]} docs
 * @returns {Index}
 */
export function createIndex(docs) {
  /** @type {Index["terms"]} */
  const terms = new Map();
  docs.forEach((doc, i) => {
    /** @param {string} text @param {number} weight */
    const add = (text, weight) => {
      for (const term of words(text)) {
        let postings = terms.get(term);
        if (!postings) terms.set(term, (postings = new Map()));
        postings.set(i, Math.max(postings.get(i) ?? 0, weight));
      }
    };
    add(doc.x, WEIGHT.text);
    add(doc.p, WEIGHT.page);
    add(doc.h, WEIGHT.heading);
  });
  return { docs, terms, vocab: [...terms.keys()] };
}

/**
 * Optimal string alignment distance, abandoned as soon as it exceeds `max`.
 * @param {string} a @param {string} b @param {number} max
 */
export function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row[j] = d;
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** Typos allowed for a query word. Chinese and Japanese terms are one or two characters: exact only. */
/** @param {string} q */
const allowedEdits = (q) => (isCjk(q) || q.length <= 3 ? 0 : q.length <= 6 ? 1 : 2);

/**
 * Scores every vocabulary word against one query word.
 * @param {Index} index @param {string} q @param {boolean} isLast the word still being typed
 * @returns {[string, number][]}
 */
function matchWord(index, q, isLast) {
  const max = allowedEdits(q);
  /** @type {[string, number][]} */
  const out = [];
  for (const term of index.vocab) {
    let score = 0;
    if (term === q) score = 1;
    else if (isLast && q.length >= 2 && !isCjk(q) && term.startsWith(q)) score = 0.9 - Math.min(0.3, (term.length - q.length) * 0.03);
    else if (max) {
      const d = distance(q, term, max);
      if (d <= max) score = 0.7 - 0.2 * (d - 1);
      else if (isLast && term.length > q.length) {
        const dp = distance(q, term.slice(0, q.length), max);
        if (dp <= max) score = 0.5 - 0.15 * (dp - 1);
      }
    }
    if (score > 0) out.push([term, score]);
  }
  return out;
}

/**
 * @param {Index} index
 * @param {string} query
 * @param {number} [limit]
 * @returns {{ doc: Doc, score: number, terms: Set<string> }[]}
 */
export function search(index, query, limit = 12) {
  const qs = words(query);
  if (!qs.length) return [];
  /** @type {Map<number, number>} */ const scores = new Map();
  /** @type {Map<number, number>} */ const matched = new Map();
  /** @type {Map<number, Set<string>>} */ const hits = new Map();

  qs.forEach((q, qi) => {
    /** @type {Map<number, number>} */
    const best = new Map();
    for (const [term, s] of matchWord(index, q, qi === qs.length - 1)) {
      for (const [doc, weight] of /** @type {Map<number, number>} */ (index.terms.get(term))) {
        const value = s * weight;
        if (value > (best.get(doc) ?? 0)) best.set(doc, value);
        let set = hits.get(doc);
        if (!set) hits.set(doc, (set = new Set()));
        set.add(term);
      }
    }
    for (const [doc, value] of best) {
      scores.set(doc, (scores.get(doc) ?? 0) + value);
      matched.set(doc, (matched.get(doc) ?? 0) + 1);
    }
  });

  let ranked = [...scores].filter(([doc]) => matched.get(doc) === qs.length);
  if (!ranked.length) ranked = [...scores];
  return ranked
    .sort((a, b) => b[1] - a[1] || index.docs[a[0]].h.length - index.docs[b[0]].h.length)
    .slice(0, limit)
    .map(([doc, score]) => ({ doc: index.docs[doc], score, terms: /** @type {Set<string>} */ (hits.get(doc)) }));
}

/**
 * Returns an HTML-escaped excerpt of `text` around the first matched word,
 * with matched words wrapped in <mark>.
 * @param {string} text @param {Set<string>} terms @param {number} [size]
 */
export function excerpt(text, terms, size = 150) {
  const WORD = /([\p{L}\p{N}]+)/u;
  const cjkTerms = [...terms].filter(isCjk).sort((a, b) => b.length - a.length);
  const lower = normalize(text);

  // Start the excerpt a little before the first match.
  let first = -1;
  let offset = 0;
  for (const part of text.split(WORD)) {
    if (terms.has(normalize(part))) {
      first = offset;
      break;
    }
    offset += part.length;
  }
  for (const term of cjkTerms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  const spaced = !CJK.test(text);
  const start = Math.max(0, first - (spaced ? 40 : 20));

  let slice = text.slice(start, start + size);
  if (spaced && start > 0) slice = slice.replace(/^\S*\s/, "");
  if (spaced && start + size < text.length) slice = slice.replace(/\s\S*$/, "");
  const prefix = start > 0 ? "…" : "";
  const suffix = start + size < text.length ? "…" : "";

  const html = slice
    .split(WORD)
    .map((part) => {
      if (terms.has(normalize(part))) return `<mark>${escape(part)}</mark>`;
      if (!cjkTerms.length || !CJK.test(part)) return escape(part);
      // Mark Chinese and Japanese matches inside a run, longest terms first.
      const pattern = new RegExp(cjkTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
      let out = "";
      let last = 0;
      for (const m of part.matchAll(pattern)) {
        out += `${escape(part.slice(last, m.index))}<mark>${escape(m[0])}</mark>`;
        last = (m.index ?? 0) + m[0].length;
      }
      return out + escape(part.slice(last));
    })
    .join("");
  return prefix + html + suffix;
}

/** @param {string} s */
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
