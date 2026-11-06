/**
 * Testes de sabotagem: quebram o ambiente de propósito e verificam se o jogo continua
 * jogável, sem erros de execução.
 *
 * Uso: npm run test:sabotage
 */
import { abrirJogo, comecarJogo, executar, verificar, SAVE_KEY } from "./lib/harness.mjs";

/** Abre o jogo com um save injetado e tenta continuar a partir dele. */
async function comSave(browser, valor) {
  const { page, context, erros } = await abrirJogo(browser, {
    antes: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(valor)});`,
  });
  const continuar = await page.$("#bCont");
  if (continuar) {
    await continuar.click();
    await page.waitForTimeout(300);
    const acao = await page.$(".choice, #aAtk");
    if (acao) await acao.click();
    await page.waitForTimeout(500);
  } else {
    await comecarJogo(page);
  }
  const jogavel = await page.evaluate(() => !!document.querySelector(".choice, #aAtk, #bNew"));
  await context.close();
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(jogavel, "o jogo ficou sem nenhuma ação possível");
  return continuar ? "save tratado sem quebrar" : "save descartado, novo jogo funciona";
}

const heroiValido = {
  name: "Teste",
  origin: "pastor",
  attrs: { ST: 10, DX: 12, IQ: 10, HT: 11 },
  skills: { bordao: 2 },
  adv: [],
  weapons: ["bordao", "punhos"],
  weapon: "bordao",
  armor: "la",
  shield: false,
  inv: { ervas: 1 },
  coins: 6,
  unspent: 10,
  earned: 0,
  sangue: 0,
  visao: false,
  flags: {},
  visited: {},
  scene: "c1_inicio",
  banner: null,
  combat: null,
  dead: false,
  mode: "playing",
  hp: 13,
  fp: 11,
};
const comHeroi = (mudancas) => JSON.stringify({ ...heroiValido, ...mudancas });

const casos = [
  [
    "Armazenamento do navegador bloqueado",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, {
        antes: `Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError"); } });`,
      });
      await comecarJogo(page);
      await page.click(".choice[data-i='0']");
      await page.waitForTimeout(600);
      const cena = await page.evaluate(() => state.scene);
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      return `jogou sem salvar, cena ${cena}`;
    },
  ],
  ["Save com JSON inválido", (b) => comSave(b, "{isto não é json")],
  ["Save vazio ({})", (b) => comSave(b, "{}")],
  ["Save com tipo errado (lista)", (b) => comSave(b, "[1,2,3]")],
  ["Save com tipo errado (texto)", (b) => comSave(b, JSON.stringify("oi"))],
  ["Save nulo", (b) => comSave(b, "null")],
  ["Save com cena inexistente", (b) => comSave(b, comHeroi({ scene: "c9_nao_existe" }))],
  [
    "Save com arma, armadura e amuleto inexistentes",
    (b) => comSave(b, comHeroi({ weapon: "laser", weapons: ["laser"], armor: "kevlar", amulet: "anel" })),
  ],
  [
    "Save com números absurdos",
    (b) =>
      comSave(
        b,
        comHeroi({
          hp: "muito",
          fp: null,
          coins: -1e308,
          attrs: { ST: 9999, DX: -5, IQ: "x", HT: Infinity },
        }),
      ),
  ],
  [
    "Save de versão antiga, sem os campos novos",
    (b) =>
      comSave(
        b,
        JSON.stringify({
          name: "Antigo",
          origin: "ferreiro",
          attrs: { ST: 12, DX: 11, IQ: 10, HT: 11 },
          skills: {},
          weapons: ["martelo"],
          weapon: "martelo",
          armor: "gibao",
          inv: {},
          flags: {},
          visited: {},
          scene: "c1_vau",
          mode: "playing",
          hp: 12,
          fp: 11,
        }),
      ),
  ],
  [
    "Save com combate corrompido",
    (b) => comSave(b, comHeroi({ combat: { foes: [{ k: "dragao" }], spec: {}, log: "não é lista" } })),
  ],
  ["Save com origem inexistente", (b) => comSave(b, comHeroi({ origin: "astronauta" }))],
  [
    "Todas as imagens fora do ar",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, {
        rotas: (ctx) => ctx.route(/\.jpg$/, (r) => r.abort()),
      });
      await comecarJogo(page);
      await page.evaluate(() => {
        startCombat({ e: ["redcap"], win: "c1_redcap_bw", lose: "c1_derrota_final" });
        render();
      });
      await page.click("#aAtk");
      await page.waitForTimeout(500);
      const desenhou = await page.evaluate(() => {
        const c = document.getElementById("art");
        return c.getContext("2d").getImageData(c.width / 2, c.height / 2, 1, 1).data[3] > 0;
      });
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(desenhou, "o fundo da cena ficou vazio");
      return "ilustrações procedurais assumiram";
    },
  ],
  [
    "Navegador sem Web Audio",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, {
        antes: `delete window.AudioContext; delete window.webkitAudioContext;`,
      });
      await comecarJogo(page);
      await page.click("#btnSound");
      await page.click(".choice[data-i='0']");
      await page.waitForTimeout(600);
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      return "jogo segue em silêncio";
    },
  ],
  [
    "Cliques em rajada nas escolhas e no combate (200 cliques)",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      for (let i = 0; i < 200; i++) {
        const alvo = await page.$(".choice, #aAtk");
        if (!alvo) break;
        await alvo.click({ force: true, noWaitAfter: true, timeout: 500 }).catch(() => {});
      }
      await page.waitForTimeout(800);
      const estado = await page.evaluate(() => ({ cena: state.scene, ok: Number.isFinite(state.hp) }));
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(estado.ok, "o estado ficou inválido");
      return `parou em ${estado.cena}`;
    },
  ],
  [
    "Duplo clique em todos os botões de combate",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      await page.evaluate(() => {
        startCombat({ e: ["recruta", "cao"], win: "c1_visao", lose: "c1_visao" });
        render();
      });
      for (let i = 0; i < 40; i++) {
        const botoes = await page.$$(".actions .btn:not([disabled]), .foe:not([disabled])");
        if (!botoes.length) break;
        await botoes[i % botoes.length].dblclick({ force: true, timeout: 500 }).catch(() => {});
      }
      await page.waitForTimeout(300);
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
    },
  ],
  [
    "Redimensionar a janela 100 vezes durante a animação",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      for (let i = 0; i < 100; i++) {
        await page.setViewportSize({ width: 320 + ((i * 97) % 1400), height: 480 + ((i * 53) % 600) });
      }
      await page.waitForTimeout(300);
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
    },
  ],
  [
    "Abrir e fechar telas sobrepostas 15 vezes seguidas",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      for (let i = 0; i < 15; i++) {
        await page.click("#btnEvolve");
        await page.click("[data-t='arma']");
        await page.keyboard.press("Escape");
        await page.click("#btnMenu");
        await page.click("#mClose");
      }
      const aberta = await page.evaluate(() => !document.getElementById("overlay").hidden);
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(!aberta, "uma tela sobreposta ficou presa aberta");
    },
  ],
];

process.exit((await executar("Testes de sabotagem", casos)) ? 1 : 0);
