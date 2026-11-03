/** Shiki themes matching the Blueprint palette: ink, cobalt, rust, slate. */
import type { ThemeRegistrationRaw } from "shiki";

const theme = (name: string, type: "light" | "dark", c: { fg: string; keyword: string; string: string; comment: string; type: string; punct: string }): ThemeRegistrationRaw => ({
  name,
  type,
  colors: { "editor.background": "#00000000", "editor.foreground": c.fg },
  settings: [
    { settings: { foreground: c.fg } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.comment, fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new", "constant.language", "variable.language"], settings: { foreground: c.keyword } },
    { scope: ["string", "string.template", "punctuation.definition.string", "markup.inline.raw"], settings: { foreground: c.string } },
    { scope: ["constant.numeric"], settings: { foreground: c.keyword } },
    { scope: ["entity.name.type", "support.type", "entity.name.class", "support.class"], settings: { foreground: c.type } },
    { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"], settings: { foreground: c.fg, fontStyle: "bold" } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: c.punct } },
    { scope: ["support.type.property-name.json"], settings: { foreground: c.keyword } },
    { scope: ["markup.heading", "entity.name.section"], settings: { foreground: c.keyword, fontStyle: "bold" } },
    { scope: ["variable.parameter", "variable.other.readwrite"], settings: { foreground: c.fg } },
  ],
});

export const light: ThemeRegistrationRaw = theme("blueprint-light", "light", {
  fg: "#0a0f1f",
  keyword: "#1d3bff",
  string: "#b4361b",
  comment: "#5f6680",
  type: "#13279e",
  punct: "#4a5168",
});

export const dark: ThemeRegistrationRaw = theme("blueprint-dark", "dark", {
  fg: "#e8ecfa",
  keyword: "#8ea0ff",
  string: "#ff9a7a",
  comment: "#959dbf",
  type: "#b9c3ff",
  punct: "#a9b0cf",
});
