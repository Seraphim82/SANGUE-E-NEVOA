/**
 * Testes do modo cinema: a luta encenada depois de cada ação, a abertura dos capítulos,
 * a aparência do herói e a galeria da jornada.
 *
 * Uso: npm run test:cinema
 */
import { abrirJogo, comecarJogo, executar, verificar, SAVE_KEY, URL_JOGO } from "./lib/harness.mjs";

/** Entra num combate de teste contra um inimigo comum. */
async function entrarEmCombate(page) {
  await page.evaluate(() => {
    runOutcome({ e: ["recruta"], win: "c1_inicio", lose: "c1_inicio" });
  });
  await page.waitForSelector("#aAtk");
}

const casos = [
  [
    "um ataque abre o cinema, que fecha sozinho e devolve a página",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      await page.evaluate(() => CINEMA.stop());
      await entrarEmCombate(page);
      await page.click("#aAtk");
      verificar(await page.evaluate(() => CINEMA.isPlaying()), "o cinema não começou depois do ataque");
      verificar(await page.isVisible("#cinema"), "a camada do cinema não apareceu");
      await page.waitForFunction(() => !CINEMA.isPlaying(), null, { timeout: 15000 });
      verificar(await page.isHidden("#cinema"), "a camada do cinema não fechou");
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "um clique pula a cena",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      await page.evaluate(() => CINEMA.stop());
      await entrarEmCombate(page);
      await page.click("#aAtk");
      await page.waitForTimeout(150);
      await page.mouse.click(400, 300);
      verificar(!(await page.evaluate(() => CINEMA.isPlaying())), "o clique não pulou a cena");
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "uma tecla pula a cena e o combate continua jogável",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      await page.evaluate(() => CINEMA.stop());
      await entrarEmCombate(page);
      let acoes = 0;
      for (let i = 0; i < 30 && (await page.$("#aAtk")); i++) {
        await page.click("#aAtk");
        acoes++;
        await page.keyboard.press("Space");
      }
      verificar(acoes > 0, "nenhuma ação feita");
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
      return `${acoes} ações`;
    },
  ],
  [
    "todas as ações e magias são encenadas sem erro",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      const r = await page.evaluate(async () => {
        CINEMA.stop();
        const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const acoes = [
          () => playerAttack("normal"),
          () => playerAttack("allout"),
          () => playerTech("finta"),
          () => playerTech("folego"),
          playerTotalDef,
          playerHerbs,
          playerAmulet,
          ...Object.keys(SK)
            .filter((k) => SK[k].spell)
            .map((k) => () => playerCast(k)),
        ];
        let filmes = 0;
        for (const acao of acoes) {
          state.hp = maxHP(state);
          state.fp = maxFP(state);
          state.inv.ervas = 3;
          state.inv.sorveira = 1;
          state.amulet = "sorveira";
          for (const k of Object.keys(SK)) if (SK[k].spell) state.skills[k] = 8;
          runOutcome({
            e: ["recruta", "recruta"],
            allies: [{ n: "Tam", skill: 12, dmg: "1d+1", type: "cut" }],
            win: "c1_inicio",
            lose: "c1_inicio",
          });
          CINEMA.begin(state.combat);
          try {
            acao();
          } finally {
            CINEMA.end();
          }
          if (CINEMA.isPlaying()) filmes++;
          await wait(400);
          CINEMA.stop();
        }
        return { filmes, acoes: acoes.length };
      });
      verificar(r.filmes >= r.acoes - 1, `só ${r.filmes} de ${r.acoes} ações viraram cena`);
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
      return `${r.filmes} cenas`;
    },
  ],
  [
    "cinema desligado no menu não encena nada",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      await page.evaluate(() => {
        CINEMA.stop();
        CINEMA.setMode("desligado");
      });
      await entrarEmCombate(page);
      await page.click("#aAtk");
      verificar(!(await page.evaluate(() => CINEMA.isPlaying())), "o cinema rodou mesmo desligado");
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "o botão do menu passa pelos três modos e lembra a escolha",
    async (browser) => {
      const { page, context } = await abrirJogo(browser, { cinema: true });
      const modos = [];
      for (let i = 0; i < 3; i++) {
        await page.click("#btnMenu");
        await page.click("#tCinema");
        modos.push(await page.evaluate(() => CINEMA.mode));
        await page.click("#mClose");
      }
      verificar(modos.join(",") === "rapido,desligado,completo", `modos: ${modos.join(",")}`);
      const salvo = await page.evaluate(() => localStorage.getItem("sen-cinema"));
      verificar(salvo.includes("completo"), `preferência salva: ${salvo}`);
      await context.close();
    },
  ],
  [
    "com movimento reduzido no sistema o cinema não roda",
    async (browser) => {
      const { page, context } = await abrirJogo(browser, { cinema: true });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      await page.waitForTimeout(300);
      await comecarJogo(page);
      await entrarEmCombate(page);
      await page.click("#aAtk");
      verificar(!(await page.evaluate(() => CINEMA.isPlaying())), "o cinema rodou com movimento reduzido");
      await context.close();
    },
  ],
  [
    "o Capítulo I abre com cartela de título",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser, { cinema: true });
      await comecarJogo(page);
      const abriu = await page.evaluate(() => CINEMA.isPlaying());
      verificar(abriu, "a cartela do capítulo não apareceu");
      await page.waitForFunction(() => !CINEMA.isPlaying(), null, { timeout: 8000 });
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "a aparência escolhida na criação vai para o herói e para o save",
    async (browser) => {
      const { page, context } = await abrirJogo(browser);
      await page.click("#bNew");
      await page.click('[data-look="morena"]');
      await page.click("#bNext");
      await page.click("#eOk");
      await page.waitForTimeout(200);
      const look = await page.evaluate(() => state.look);
      const salvo = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).look, SAVE_KEY);
      verificar(look === "morena" && salvo === "morena", `aparência: ${look}, no save: ${salvo}`);
      await context.close();
    },
  ],
  [
    "a galeria registra o começo de cada capítulo e aparece na tela do personagem",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      const n = await page.evaluate(() => {
        state.armor = "malha";
        state.outfits.push("malha");
        go("c2_inicio");
        return state.journey.length;
      });
      verificar(n === 2, `a galeria tem ${n} capítulos, esperava 2`);
      await page.evaluate(() => openChar("roupa"));
      const quadros = await page.$$eval(".journey canvas", (l) => l.length);
      verificar(quadros === 2, `a tela do personagem mostra ${quadros} quadros`);
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "aparência e galeria adulteradas no save são descartadas",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      const r = await page.evaluate(() => {
        const base = newChar("X", "pastor");
        base.mode = "playing";
        const c = sanitizeSave({
          ...base,
          look: "__proto__",
          journey: [
            { ch: 1, armor: "la", weapon: "faca", wl: 99, amulet: "nada", sangue: 50 },
            { ch: 1, armor: "la", weapon: "faca" },
            { ch: 2, armor: "<img src=x>", weapon: "faca" },
            { ch: 9, armor: "la", weapon: "faca" },
            "lixo",
          ],
        });
        return { look: c.look, journey: c.journey };
      });
      verificar(r.look === "ruivo", `aparência inválida aceita: ${r.look}`);
      verificar(r.journey.length === 1, `galeria com ${r.journey.length} itens, esperava 1`);
      const j = r.journey[0];
      verificar(
        j.wl === 3 && j.amulet === null && j.sangue <= 4,
        `galeria não foi limpa: ${JSON.stringify(j)}`,
      );
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
  [
    "toda cena tem uma faixa da trilha sonora gravada",
    async (browser) => {
      const { page, context } = await abrirJogo(browser);
      const r = await page.evaluate(() => {
        const faixas = new Set([
          "tema",
          "aldeia",
          "estrada",
          "taverna",
          "suspense",
          "sombrio",
          "mistico",
          "lamento",
          "vitoria",
          "final",
        ]);
        const sem = Object.keys(SC).filter((id) => !faixas.has(trackFor(id)));
        const usadas = new Set(Object.keys(SC).map(trackFor));
        return { sem, usadas: [...usadas].sort() };
      });
      verificar(!r.sem.length, `cenas sem faixa: ${r.sem.join(", ")}`);
      verificar(r.usadas.length >= 9, `só ${r.usadas.length} faixas usadas: ${r.usadas.join(", ")}`);
      await context.close();
      return `${r.usadas.length} faixas usadas nas cenas`;
    },
  ],
  [
    "no celular, um toque basta para seguir uma escolha (loja do intendente)",
    async (browser) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await context.addInitScript(() =>
        localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" })),
      );
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", (e) => erros.push(e.message));
      await page.goto(URL_JOGO);
      await page.evaluate(() => {
        state = newChar("Rowan", "ferreiro");
        state.mode = "playing";
        migrate(state);
        state.coins = 30;
        go("c3_intendente");
      });
      const tocar = async (texto) => {
        const botao = page.locator(".choice", { hasText: texto }).first();
        await botao.scrollIntoViewIfNeeded();
        await botao.tap();
        await page.waitForTimeout(700);
      };
      await tocar("barras de ferro");
      const ferro = await page.evaluate(() => [state.scene, state.mat.ferro]);
      verificar(ferro[0] === "c3_intendente" && ferro[1] >= 2, `a compra não aconteceu num toque: ${ferro}`);
      await tocar("Partir em missão");
      const cena = await page.evaluate(() => state.scene);
      verificar(cena === "c3_missao", `um toque em "Partir em missão" deixou o jogo em ${cena}`);
      verificar(!erros.length, `erros: ${erros.join("; ")}`);
      await context.close();
    },
  ],
];

const falhas = await executar("Testes do cinema e do retrato do herói", casos);
process.exit(falhas ? 1 : 0);
