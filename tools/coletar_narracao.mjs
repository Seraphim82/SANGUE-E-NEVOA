/**
 * Coleta todos os parágrafos que o narrador pode ler e grava tools/narracao.json.
 *
 * Os textos mudam conforme as escolhas, então além de ler cada cena com um herói novo, o
 * coletor joga muitas partidas aleatórias até o fim e anota cada versão de parágrafo que
 * aparece. Cada parágrafo é guardado uma vez só, com a chave que o jogo usa para achar o áudio.
 *
 * Uso: node tools/coletar_narracao.mjs [partidas]   (padrão: 400)
 */
import fs from "node:fs";
import path from "node:path";
import { abrirNavegador, abrirJogo, RAIZ } from "../tests/lib/harness.mjs";

const partidas = Number(process.argv[2]) || 400;
const browser = await abrirNavegador();
const LOTE = 50; // partidas por página: muitas de uma vez esgotam a memória do navegador
const todos = new Map();
const erros = [];

const coletar = (partidas) => {
  const clips = new Map();
  const anotar = (id) => {
    for (const texto of sceneNarration(id)) {
      const chave = narrationKey(texto);
      if (!clips.has(chave)) clips.set(chave, { chave, texto, cena: id });
    }
  };
  const origens = Object.keys(ORIGINS);
  // 1. Cada cena lida com um herói recém-criado.
  for (const id of Object.keys(SC)) {
    state = newChar("Teste", origens[0]);
    state.mode = "playing";
    migrate(state);
    anotar(id);
  }
  // 2. As frases do trailer do final, para cada final e para as marcas que mudam os quadros.
  for (const final of ["primavera", "selo", "dama", "inverno"])
    for (const kelpie of [0, 1])
      for (const tamMorto of [0, 1]) {
        state = newChar("Teste", origens[0]);
        state.mode = "playing";
        migrate(state);
        state.flags.kelpie_divida = kelpie;
        state.flags.tam_morto = tamMorto;
        for (const texto of CINEMA.finaleNarration(final)) {
          const chave = narrationKey(texto);
          if (!clips.has(chave)) clips.set(chave, { chave, texto, cena: "c6_trailer" });
        }
      }
  // 3. Partidas aleatórias: cada cena visitada é lida com as marcas daquele momento.
  CINEMA.finale = () => {};
  CINEMA.titleCard = () => {};
  const goOriginal = go;
  go = (id, keep) => {
    goOriginal(id, keep);
    anotar(id);
  };
  for (let n = 0; n < partidas; n++) {
    state = newChar("Teste", origens[n % origens.length]);
    state.mode = "playing";
    migrate(state);
    go("c1_inicio");
    for (let passo = 0; passo < 3000 && !state.dead && state.scene !== "c6_epilogo"; passo++) {
      if (state.combat) {
        state.hp = Math.max(state.hp, 8);
        playerAttack("normal");
        continue;
      }
      const opcoes = visibleChoices(SC[state.scene]).filter((c) => c.act !== "newgame" && c.act !== "filme");
      if (!opcoes.length) break;
      const i = Math.floor(Math.random() * opcoes.length);
      closeEvolve();
      choose(visibleChoices(SC[state.scene]).indexOf(opcoes[i]));
      closeEvolve();
    }
  }
  go = goOriginal;
  return [...clips.values()];
};

for (let feitas = 0; feitas < partidas; feitas += LOTE) {
  const { page, context, erros: e } = await abrirJogo(browser);
  for (const c of await page.evaluate(coletar, Math.min(LOTE, partidas - feitas)))
    if (!todos.has(c.chave)) todos.set(c.chave, c);
  erros.push(...e);
  await context.close();
  console.log(`${Math.min(feitas + LOTE, partidas)} partidas, ${todos.size} parágrafos`);
}
const coletado = [...todos.values()];

const capitulo = (cena) => Number((/^c(\d)/.exec(cena) || [0, 9])[1]);
coletado.sort((a, b) => capitulo(a.cena) - capitulo(b.cena) || a.cena.localeCompare(b.cena));
const destino = path.join(RAIZ, "tools/narracao.json");
fs.writeFileSync(destino, `${JSON.stringify(coletado, null, 1)}\n`);
const caracteres = coletado.reduce((n, c) => n + c.texto.length, 0);
console.log(`${coletado.length} parágrafos, ${caracteres} caracteres → tools/narracao.json`);
if (erros.length) console.log("erros:", erros.slice(0, 3));
await browser.close();
