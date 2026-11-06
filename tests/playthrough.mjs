/**
 * Testes automatizados de Sangue e Névoa.
 *
 * 1. Valida o grafo da história: toda escolha leva a uma cena existente, toda cena
 *    é alcançável a partir do início e tem ilustração e música definidas.
 * 2. Joga partidas completas, do Capítulo I ao epílogo, com escolhas aleatórias e um
 *    jogador automático que gasta pontos e melhora itens, e conta os finais.
 *
 * Uso: npm test            (30 partidas)
 *      npm test -- 100     (100 partidas)
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const partidas = Number(process.argv[2] || 30);

const browser = await chromium.launch();
const page = await browser.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
await page.goto(pathToFileURL(path.join(raiz, "index.html")).href);

const resultado = await page.evaluate((partidas) => {
  const problemas = [];
  const arestas = {};
  const alvos = (o) => {
    if (!o) return [];
    if (typeof o === "function") o = o();
    return typeof o === "string" ? [o] : [o.win, o.lose, o.flee].filter(Boolean);
  };
  const cenarios = [
    {},
    {
      bw_divida: 1,
      kelpie_divida: 1,
      mairi_viva: 1,
      cailleach: 1,
      hale_morto: 1,
      ailsa: 1,
      pacto_cailleach: 1,
      cailleach_verdade: 1,
      ponte_serrada: 1,
      pedra_levada: 1,
    },
    {
      sangue_frio: 1,
      quebrou_pacto: 1,
      tam_morto: 1,
      aodh_morto: 1,
      callum_arqueiro: 1,
      ailsa: 1,
      ailsa_morta: 1,
    },
  ];
  for (const flags of cenarios) {
    S = newChar("Teste", "ferreiro");
    S.mode = "playing";
    migrate(S);
    S.flags = flags;
    S.coins = 99;
    S.weapons.push("espada", "arco");
    S.armor = "malha";
    for (const id in SC) {
      const e = (arestas[id] = arestas[id] || new Set());
      for (const ch of SC[id].choices) {
        alvos(ch.go).forEach((x) => e.add(x));
        if (ch.test) [ch.test.ok, ch.test.fail].forEach((o) => alvos(o).forEach((x) => e.add(x)));
        if (ch.fight) alvos(ch.fight).forEach((x) => e.add(x));
      }
      try {
        SC[id].text();
      } catch (err) {
        problemas.push(`${id}: texto quebra (${err.message})`);
      }
    }
  }
  for (const id in arestas)
    for (const t of arestas[id]) if (!SC[t]) problemas.push(`${id} → ${t}: cena inexistente`);
  for (const id in SC) if (!META[id]) problemas.push(`${id}: sem ilustração/música`);
  const vistas = new Set(["c1_inicio"]);
  const fila = ["c1_inicio"];
  while (fila.length)
    for (const t of arestas[fila.shift()] || []) if (!vistas.has(t)) vistas.add(t), fila.push(t);
  for (const id in SC) if (!vistas.has(id)) problemas.push(`${id}: inalcançável`);

  const gastar = () => {
    const sk = WEAPONS[S.weapon].sk;
    for (let i = 0; i < 50 && S.unspent > 0; i++) {
      const p = S.skills[sk] || 0;
      const custo = nextPts(p) - p;
      if (Math.random() < 0.5 && custo <= S.unspent) (S.unspent -= custo), (S.skills[sk] = nextPts(p));
      else if (S.unspent >= 10 && S.attrs.HT < 16) (S.unspent -= 10), S.attrs.HT++, S.hp++;
      else if (S.unspent >= 10 && S.attrs.ST < 16) (S.unspent -= 10), S.attrs.ST++, S.hp++;
      else break;
    }
  };
  const forjar = () => {
    for (const [slot, k] of [
      ["arma", S.weapon],
      ["roupa", S.armor],
    ])
      while (canUpgrade(slot, k)) {
        const L = upLevel(slot, k);
        const [pc, q] = UPCOST[L];
        S.coins -= pc;
        S.mat[matFor(slot, k)] -= q;
        S.up[upKey(slot, k)] = L + 1;
      }
  };
  const r = { completas: 0, mortes: 0, travadas: 0, finais: {} };
  for (let run = 0; run < partidas; run++) {
    S = newChar("Teste", ["ferreiro", "pastor", "curandeira"][run % 3]);
    S.mode = "playing";
    migrate(S);
    S.unspent = 0;
    go("c1_inicio");
    let cap = "";
    let passos = 0;
    for (; passos < 3000; passos++) {
      if (S.scene.slice(0, 3) !== cap) {
        cap = S.scene.slice(0, 3);
        gastar();
        const melhor = ["gibao_stirling", "malha", "peles", "couro", "tartan", "gibao", "la"].find((k) =>
          S.outfits.includes(k),
        );
        if (melhor) S.armor = melhor;
        forjar();
      }
      if (S.dead) {
        r.mortes++;
        break;
      }
      if (S.scene === "c6_epilogo") {
        r.completas++;
        r.finais[S.flags.final] = (r.finais[S.flags.final] || 0) + 1;
        break;
      }
      if (S.combat) {
        const C = S.combat;
        if (S.techs.includes("folego") && !C.used.folego && S.hp < maxHP(S) / 2) playerTech("folego");
        else if (S.hp < maxHP(S) / 3 && S.inv.ervas > 0) playerHerbs();
        else if (S.amulet && !C.used.amu) playerAmulet();
        else playerAttack("normal");
        continue;
      }
      const opcoes = visibleChoices(SC[S.scene]);
      const reais = opcoes.filter((c) => c.act !== "evolve" && c.act !== "newgame");
      if (!reais.length) break;
      choose(opcoes.indexOf(reais[Math.floor(Math.random() * reais.length)]));
    }
    if (passos >= 3000) r.travadas++;
  }
  return { cenas: Object.keys(SC).length, problemas, ...r };
}, partidas);

await browser.close();
console.log(`Cenas: ${resultado.cenas}`);
console.log(
  `Partidas: ${partidas} · completas: ${resultado.completas} · mortes: ${resultado.mortes} · travadas: ${resultado.travadas}`,
);
console.log("Finais:", resultado.finais);
const falhas = [...resultado.problemas, ...erros.map((e) => `erro de execução: ${e}`)];
if (resultado.travadas) falhas.push(`${resultado.travadas} partida(s) travaram`);
if (falhas.length) {
  console.error("\nFalhas:\n- " + falhas.join("\n- "));
  process.exit(1);
}
console.log("\nTudo certo.");
