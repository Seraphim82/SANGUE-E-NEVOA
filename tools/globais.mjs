/**
 * Gera tools/globais.json: a lista de nomes declarados no nível superior de cada
 * script do jogo, para o ESLint saber o que é compartilhado entre os arquivos.
 * Também falha se o mesmo nome for declarado em dois arquivos.
 *
 * Uso: node tools/globais.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const arquivos = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const declaradoEm = Object.create(null);
const duplicados = [];
for (const arquivo of arquivos) {
  const codigo = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
  for (const m of codigo.matchAll(/^(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm)) {
    const nome = m[1];
    if (declaradoEm[nome] && declaradoEm[nome] !== arquivo)
      duplicados.push(`${nome}: ${declaradoEm[nome]} e ${arquivo}`);
    declaradoEm[nome] = arquivo;
  }
  for (const m of codigo.matchAll(
    /^const\s+(?:\{|\[)?\s*([A-Za-z_$][\w$]*)\s*=[^;\n]*?,\s*([A-Za-z_$][\w$]*)\s*=/gm,
  )) {
    declaradoEm[m[2]] = declaradoEm[m[2]] || arquivo;
  }
}
if (duplicados.length) {
  console.error("Nomes globais declarados em mais de um arquivo:\n- " + duplicados.join("\n- "));
  process.exit(1);
}
const lista = Object.fromEntries(
  Object.keys(declaradoEm)
    .sort()
    .map((n) => [n, "writable"]),
);
writeFileSync(new URL("./globais.json", import.meta.url), JSON.stringify(lista, null, 2) + "\n");
console.log(`${Object.keys(lista).length} globais em ${arquivos.length} arquivos.`);
