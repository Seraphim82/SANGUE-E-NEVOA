/**
 * Configuração do ESLint.
 *
 * Os scripts do jogo são carregados como scripts comuns e compartilham o escopo global.
 * Por isso a lista de globais é gerada a partir das declarações de nível superior de
 * cada arquivo (veja tools/globais.mjs), e não declarada à mão.
 */
import js from "@eslint/js";
import globals from "globals";
import { readFileSync } from "node:fs";

const globaisDoJogo = JSON.parse(readFileSync(new URL("./tools/globais.json", import.meta.url)));

export default [
  { ignores: ["node_modules/**", "img/**", "docs/**"] },
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, ...globaisDoJogo },
    },
    rules: {
      "no-unused-vars": ["error", { vars: "local", args: "none" }],
      "no-redeclare": "off",
      eqeqeq: ["error", "always"],
      "no-implicit-globals": "off",
      "no-shadow-restricted-names": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["tools/**/*.mjs", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
  },
  {
    // Os testes rodam no Node, mas o código passado a page.evaluate() roda dentro do
    // navegador, onde as variáveis do jogo existem.
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser, ...globaisDoJogo },
    },
  },
];
