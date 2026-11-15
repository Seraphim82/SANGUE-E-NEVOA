/**
 * Atualiza js/data/action-shots.js com os planos de ação que existem em img/action/.
 * Rode depois de gerar planos novos: node tools/listar_planos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nomes = fs
  .readdirSync(path.join(raiz, "img/action"))
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => f.slice(0, -4))
  .sort();
const arquivo = path.join(raiz, "js/data/action-shots.js");
const atual = fs.readFileSync(arquivo, "utf8");
const lista = nomes.map((n) => `  "${n}",`).join("\n");
const novo = atual.replace(
  /const ACTION_SHOTS = new Set\(\[[\s\S]*?\]\);/,
  `const ACTION_SHOTS = new Set([\n${lista}\n]);`,
);
fs.writeFileSync(arquivo, novo);
console.log(`${nomes.length} planos em js/data/action-shots.js`);
