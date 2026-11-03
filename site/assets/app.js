// @ts-check
import { createIndex, excerpt, search } from "./search.js";

const BASE = document.documentElement.dataset.base ?? "/";
const SEARCH_INDEX = document.documentElement.dataset.search ?? `${BASE}search.json`;
/** Interface strings for the page's language, written by the site generator. */
const T = (() => {
  const fallback = { loading: "Loading…", noResults: "No results for “{q}”.", tryOther: "Try fewer or different words.", pages: "Pages", copied: "Copied", pressCopy: "Press ⌘C" };
  try {
    return { ...fallback, ...JSON.parse(document.getElementById("ui")?.textContent ?? "{}") };
  } catch {
    return fallback;
  }
})();
const $ = (/** @type {string} */ s, root = document) => /** @type {HTMLElement | null} */ (root.querySelector(s));

// ── Theme ────────────────────────────────────────────────────────────────
$("#theme")?.addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {}
});

// ── Copy ─────────────────────────────────────────────────────────────────
/** @param {HTMLElement} button @param {string} text */
async function copy(button, text) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = T.copied;
  } catch {
    button.textContent = T.pressCopy;
  }
  button.setAttribute("data-done", "");
  setTimeout(() => {
    button.textContent = label;
    button.removeAttribute("data-done");
  }, 1600);
}

document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = /** @type {HTMLElement | null} */ (target.closest("[data-copy]"));
  if (!button) return;
  const value = button.dataset.copy;
  if (value === "code") {
    const code = button.closest(".code")?.querySelector("pre");
    if (code) copy(button, code.textContent ?? "");
  } else if (value === "markdown") {
    const src = button.dataset.src ?? "";
    copy(button, await fetch(src).then((r) => r.text()));
  } else if (value) {
    copy(button, value);
  }
});

// ── Table of contents ────────────────────────────────────────────────────
const tocLinks = /** @type {HTMLAnchorElement[]} */ ([...document.querySelectorAll(".toc a")]);
if (tocLinks.length && "IntersectionObserver" in window) {
  const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        tocLinks.forEach((a) => a.classList.remove("active"));
        byId.get(entry.target.id)?.classList.add("active");
      }
    },
    { rootMargin: "-80px 0px -70% 0px" },
  );
  byId.forEach((_, id) => {
    const heading = document.getElementById(id);
    if (heading) observer.observe(heading);
  });
}

// ── Command palette ──────────────────────────────────────────────────────
const palette = $("#cmdk");
const input = /** @type {HTMLInputElement | null} */ ($("#cmdk-q"));
const list = $("#cmdk-list");

/** @type {import("./search.js").Index | undefined} */
let index;
/** @type {Promise<void> | undefined} */
let loading;
let active = 0;
/** @type {Element | null} */
let opener = null;

const ICON_PAGE = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 2h7l3 3v11H4z M11 2v3h3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const ICON_HASH = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3 5.5 15M12.5 3 11 15M3.5 7h12M3 11h12" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

function load() {
  loading ??= fetch(SEARCH_INDEX)
    .then((r) => r.json())
    .then((docs) => {
      index = createIndex(docs);
    });
  return loading;
}

/** @param {string} s */
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function render() {
  if (!list || !input) return;
  const query = input.value.trim();
  if (!index) {
    list.innerHTML = `<li class="cmdk-empty">${esc(T.loading)}</li>`;
    return;
  }
  /** @type {{ doc: import("./search.js").Doc, terms: Set<string> }[]} */
  const results = query
    ? search(index, query)
    : index.docs.filter((d) => d.h === d.p).map((doc) => ({ doc, terms: new Set() }));

  if (!results.length) {
    list.innerHTML = `<li class="cmdk-empty">${esc(T.noResults).replace("{q}", esc(query))}<br>${esc(T.tryOther)}</li>`;
    return;
  }

  active = Math.min(active, results.length - 1);
  let group = "";
  list.innerHTML = results
    .map(({ doc, terms }, i) => {
      const heading = query ? doc.p : T.pages;
      const label = heading !== group ? `<li class="cmdk-group label" role="presentation">${esc((group = heading))}</li>` : "";
      const isPage = doc.h === doc.p;
      const title = query ? excerpt(doc.h, terms, 120) : esc(doc.h);
      const body = query ? excerpt(doc.x, terms) : esc(doc.x.slice(0, 110));
      return `${label}<li class="cmdk-item" role="option" id="cmdk-${i}" aria-selected="${i === active}"><a href="${doc.u}" tabindex="-1">${isPage ? ICON_PAGE : ICON_HASH}<b>${title}</b><small>${body}</small></a></li>`;
    })
    .join("");
  input.setAttribute("aria-activedescendant", `cmdk-${active}`);
}

/** @param {number} next */
function move(next) {
  if (!list || !input) return;
  const items = [...list.querySelectorAll(".cmdk-item")];
  if (!items.length) return;
  active = (next + items.length) % items.length;
  items.forEach((item, i) => item.setAttribute("aria-selected", String(i === active)));
  items[active]?.scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", `cmdk-${active}`);
}

function open() {
  if (!palette || !input) return;
  opener = document.activeElement;
  palette.hidden = false;
  document.body.style.overflow = "hidden";
  input.focus();
  input.select();
  active = 0;
  render();
  load().then(render);
}

function close() {
  if (!palette) return;
  palette.hidden = true;
  document.body.style.overflow = "";
  if (opener instanceof HTMLElement) opener.focus();
}

document.querySelectorAll("[data-search]").forEach((el) => el.addEventListener("click", open));
palette?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.hasAttribute("data-close")) close();
});
input?.addEventListener("input", () => {
  active = 0;
  render();
});
list?.addEventListener("mousemove", (event) => {
  const item = event.target instanceof Element ? event.target.closest(".cmdk-item") : null;
  if (!item) return;
  const i = [...list.querySelectorAll(".cmdk-item")].indexOf(item);
  if (i !== active) move(i);
});

document.addEventListener("keydown", (event) => {
  const typing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]");
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    palette?.hidden ? open() : close();
    return;
  }
  if (event.key === "/" && !typing && palette?.hidden) {
    event.preventDefault();
    open();
    return;
  }
  if (!palette || palette.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    move(active + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(active - 1);
  } else if (event.key === "Enter") {
    const link = /** @type {HTMLAnchorElement | null | undefined} */ (list?.querySelectorAll(".cmdk-item a")[active]);
    if (link) {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) window.open(link.href, "_blank");
      else {
        close();
        location.href = link.href;
      }
    }
  }
});

// ── Language menu ────────────────────────────────────────────────────────
document.addEventListener("click", (event) => {
  const menu = document.querySelector(".lang-menu[open]");
  if (menu && event.target instanceof Node && !menu.contains(event.target)) menu.removeAttribute("open");
});
