/**
 * Atualiza js/data/narration-index.js com os parágrafos que já têm áudio em audio/narracao/.
 * Rode depois de gerar narração nova: node tools/listar_narracao.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pasta = path.join(raiz, "audio/narracao");
const chaves = fs.existsSync(pasta)
  ? fs
      .readdirSync(pasta)
      .filter((f) => /^[0-9a-f]{16}\.mp3$/.test(f))
      .map((f) => f.slice(0, 16))
      .sort()
  : [];
const arquivo = path.join(raiz, "js/data/narration-index.js");
const atual = fs.readFileSync(arquivo, "utf8");
const lista = chaves.map((k) => `  "${k}",`).join("\n");
fs.writeFileSync(
  arquivo,
  atual.replace(
    /const NARRATION_CLIPS = new Set\(\[[\s\S]*?\]\);/,
    `const NARRATION_CLIPS = new Set([\n${lista}\n]);`,
  ),
);
console.log(`${chaves.length} parágrafos narrados em js/data/narration-index.js`);
