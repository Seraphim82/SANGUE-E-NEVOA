/**
 * Utilitários de narrativa usados pelos capítulos.
 */
"use strict";

const toParagraphs = (s) =>
  s
    .trim()
    .split(/\n\s*\n/)
    .map((p) =>
      p.trim().startsWith("<")
        ? p.trim()
        : p.trim().startsWith("“")
          ? `<p class="speech">${p.trim()}</p>`
          : `<p>${p.trim()}</p>`,
    )
    .join("");
const heroName = () => esc(state.name);
