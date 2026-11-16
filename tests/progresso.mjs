/**
 * Testes de progresso: conquistas, jornadas salvas (espaços, exportar e importar) e narração.
 *
 * Uso: npm run test:progresso
 */
import { abrirJogo, comecarJogo, executar, servirJogo, verificar, SAVE_KEY } from "./lib/harness.mjs";

const casos = [
  [
    "conquistas: liberadas pela história, guardadas no perfil e mostradas na tela",
    async (browser) => {
      // Servido por HTTP, como no GitHub Pages: aberto do disco (file://), o Chromium de testes
      // às vezes perde o armazenamento inteiro ao recarregar, o que não acontece no site.
      const servidor = await servirJogo();
      const context = await browser.newContext();
      await context.addInitScript(() => {
        localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" }));
        localStorage.setItem("sen-narracao", JSON.stringify({ on: false }));
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", (e) => erros.push(e.message));
      await page.goto(servidor.url);
      await comecarJogo(page);
      const novas = await page.evaluate(() => {
        state.flags.kelpie_divida = 1;
        state.flags.cap1 = 1;
        go("c1_inicio");
        return Object.keys(ACH.perfil.conquistas);
      });
      verificar(novas.includes("kelpie") && novas.includes("cap1"), `conquistas liberadas: ${novas}`);
      await page.reload();
      await page.waitForTimeout(300);
      const guardadas = await page.evaluate(() => Object.keys(ACH.perfil.conquistas));
      verificar(guardadas.includes("kelpie"), "a conquista sumiu ao recarregar a página");
      await page.click("#bAch");
      const tela = await page.locator(".ach.on").count();
      verificar(tela >= 2, `a tela mostra ${tela} conquistas liberadas`);
      verificar(await page.locator(".ach-stats").count(), "a tela não mostra as estatísticas");
      await page.click("#achClose");
      verificar(await page.locator("#bNew").count(), "fechar as conquistas não voltou à tela inicial");
      verificar(!erros.length, erros.join("; "));
      await context.close();
      await servidor.fechar();
    },
  ],
  [
    "conquistas: combates contam inimigos e feéricos; morrer e cair contam",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      const r = await page.evaluate(() => {
        runOutcome({ e: ["kelpie", "recruta"], win: "c1_inicio", lose: "c1_inicio" });
        state.combat.foes.forEach((f) => (f.hp = 0));
        endCombat("win");
        runOutcome({ e: ["recruta"], win: "c1_inicio", lose: "c1_inicio" });
        endCombat("lose");
        return { ...ACH.perfil.stats, caiu: state.flags.caiu };
      });
      verificar(r.inimigos === 2 && r.feericos === 1, `contagem errada: ${JSON.stringify(r)}`);
      verificar(r.quedas === 1 && r.caiu === 1, `queda não registrada: ${JSON.stringify(r)}`);
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "conquistas: perfil adulterado no navegador é limpo e não polui o protótipo",
    async (browser) => {
      const perfil = JSON.stringify({
        conquistas: { kelpie: 1, __proto__: { polluted: 1 }, falsa: 5, cem: "x" },
        finais: ["selo", "<img src=x onerror=alert(1)>", "selo", "dama"],
        stats: { inimigos: 1e30, mortes: -5, feericos: "9", constructor: 3 },
      });
      const { page, context, erros } = await abrirJogo(browser, {
        antes: `localStorage.setItem("sen-perfil", ${JSON.stringify(perfil)})`,
      });
      const r = await page.evaluate(() => ({
        conquistas: Object.keys(ACH.perfil.conquistas),
        finais: ACH.perfil.finais,
        stats: ACH.perfil.stats,
        poluiu: {}.polluted !== undefined,
      }));
      verificar(r.conquistas.join() === "kelpie", `conquistas aceitas: ${r.conquistas}`);
      verificar(r.finais.join() === "selo,dama", `finais aceitos: ${r.finais}`);
      verificar(
        r.stats.inimigos <= 1e7 && r.stats.mortes === 0 && r.stats.feericos === 0,
        JSON.stringify(r.stats),
      );
      verificar(!r.poluiu, "o perfil poluiu o protótipo");
      await page.click("#bAch");
      verificar(!(await page.evaluate(() => window.__xss)), "HTML do perfil executou");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "jornadas: nova jornada vai para um espaço vazio e não apaga a anterior",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      await page.evaluate(() => {
        state.name = "Primeiro";
        save();
        showTitle();
      });
      await page.click("#bNew");
      await page.fill("#inName", "Segundo");
      await page.click("#bNext");
      await page.click("#eOk");
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => [slotInfo(1)?.name, slotInfo(2)?.name, activeSlot]);
      verificar(r[0] === "Primeiro" && r[1] === "Segundo" && r[2] === 2, `espaços: ${r}`);
      await page.evaluate(() => showTitle());
      await page.click("#bSlots");
      const cartoes = await page.locator(".slot .slot-nome").allTextContents();
      verificar(cartoes.join() === "Primeiro,Segundo", `tela de jornadas: ${cartoes}`);
      await page.locator('.slot[data-n="1"] [data-acao="jogar"]').click();
      verificar(
        (await page.evaluate(() => [state.name, activeSlot])).join() === "Primeiro,1",
        "não carregou a jornada do espaço 1",
      );
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "jornadas: exportar num aparelho e importar em outro traz o mesmo herói",
    async (browser) => {
      const a = await abrirJogo(browser);
      await comecarJogo(a.page);
      const codigo = await a.page.evaluate(() => {
        state.name = "Viajante";
        state.coins = 77;
        state.flags.kelpie_divida = 1;
        go("c2_inicio");
        return exportCode(activeSlot);
      });
      await a.context.close();
      verificar(/^SEN1\.[A-Za-z0-9_-]+$/.test(codigo), "código de exportação em formato inesperado");
      const b = await abrirJogo(browser);
      await b.page.click("#bSlots");
      await b.page.fill("#impCode", codigo);
      await b.page.click("#impOk");
      const r = await b.page.evaluate(() => {
        const c = loadSave(1);
        return c && [c.name, c.coins, c.scene, c.flags.kelpie_divida];
      });
      verificar(r && r.join() === "Viajante,77,c2_inicio,1", `importado: ${r}`);
      verificar(!b.erros.length, b.erros.join("; "));
      await b.context.close();
    },
  ],
  [
    "jornadas: importar lixo, HTML, código de outro jogo ou arquivo gigante é recusado com aviso",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      const r = await page.evaluate(() => {
        const casos = [
          "",
          "não é nada",
          "SEN1.@@@",
          JSON.stringify({ jogo: "outro", save: {} }),
          JSON.stringify({
            jogo: "sangue-e-nevoa",
            save: { name: "<img src=x onerror=window.__xss=1>", origin: "inexistente" },
          }),
          JSON.stringify({
            jogo: "sangue-e-nevoa",
            save: { __proto__: { polluted: 1 }, origin: "pastor", mode: "playing" },
          }),
          "x".repeat(300000),
        ];
        return casos.map((c) => {
          const out = importSave(c);
          return out.erro ? "erro" : out.save.name;
        });
      });
      verificar(
        r.slice(0, 5).every((x) => x === "erro"),
        `aceitou entradas inválidas: ${r}`,
      );
      verificar(r[6] === "erro", "aceitou um arquivo gigante");
      verificar(await page.evaluate(() => ({}).polluted === undefined), "a importação poluiu o protótipo");
      await page.click("#bSlots");
      await page.fill("#impCode", "lixo total");
      await page.click("#impOk");
      const msg = await page.locator("#impMsg").textContent();
      verificar(/reconheci/.test(msg), `sem aviso para código inválido: "${msg}"`);
      verificar(!(await page.evaluate(() => window.__xss)), "HTML importado executou");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "jornadas: apagar pede dois toques e o save antigo (sem espaços) continua no espaço 1",
    async (browser) => {
      const antigo = { name: "Antigo", origin: "pastor", mode: "playing", scene: "c1_inicio" };
      const { page, context, erros } = await abrirJogo(browser, {
        antes: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(antigo))})`,
      });
      await page.click("#bSlots");
      verificar(
        (await page.locator(".slot-nome").allTextContents()).join() === "Antigo",
        "o save antigo não aparece no espaço 1",
      );
      const apagar = page.locator('.slot[data-n="1"] [data-acao="apagar"]');
      await apagar.click();
      verificar(await page.evaluate(() => !!loadSave(1)), "um toque só já apagou a jornada");
      await apagar.click();
      verificar(await page.evaluate(() => !loadSave(1)), "o segundo toque não apagou");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "narração: menu liga e desliga; parágrafos da cena viram chaves; trilha continua por baixo",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      const r = await page.evaluate(() => {
        const paragrafos = sceneNarration("c1_inicio");
        const semNome = paragrafos.every((p) => !p.includes(state.name) && !p.includes("§"));
        const chaves = paragrafos.map(narrationKey);
        return { n: paragrafos.length, semNome, chaves: chaves.every((k) => /^[0-9a-f]{16}$/.test(k)) };
      });
      verificar(r.n >= 2 && r.semNome && r.chaves, `narração da cena: ${JSON.stringify(r)}`);
      await page.click("#btnMenu");
      const antes = await page.evaluate(() => NARRATOR.on);
      await page.click("#tNarr");
      verificar((await page.evaluate(() => NARRATOR.on)) !== antes, "o botão do menu não mudou a narração");
      await page.click("#mClose");
      // Frases com números que mudam a cada partida ficam fora da voz.
      const t = await page.evaluate(() =>
        narrationParagraphs(
          "",
          "Seu título agora é Lenda, com 312 pontos de experiência acumulados.\n\nVocê tem 9 pennies.",
        ),
      );
      verificar(t.join("|") === "Seu título agora é Lenda.", `números na voz: ${t.join("|")}`);
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "narração: toca a cena com a trilha por baixo, e tocar numa escolha interrompe",
    async (browser) => {
      const servidor = await servirJogo();
      const context = await browser.newContext();
      await context.addInitScript(() => {
        localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" }));
        localStorage.setItem("sen-narracao", JSON.stringify({ on: true }));
        localStorage.setItem("sen-audio", JSON.stringify({ music: true, sfx: true }));
      });
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", (e) => erros.push(e.message));
      await page.goto(servidor.url);
      await comecarJogo(page);
      // Uma cena cujo primeiro parágrafo já tem narração gravada.
      const cena = await page.evaluate(() =>
        Object.keys(SC).find((id) => {
          const p = sceneNarration(id);
          return p.length && NARRATION_CLIPS.has(narrationKey(p[0])) && SC[id].choices.length;
        }),
      );
      if (!cena) {
        await context.close();
        await servidor.fechar();
        return "nenhuma narração gravada ainda: pulado";
      }
      await page.evaluate((id) => go(id), cena);
      await page.waitForFunction(() => NARRATOR.isSpeaking(), null, { timeout: 8000 });
      const musica = await page.evaluate(() => AUD.playing());
      verificar(musica && musica.name, "a trilha parou durante a narração");
      await page.locator("#choices .choice").first().click();
      await page.waitForTimeout(200);
      verificar(
        !(await page.evaluate(() => NARRATOR.isSpeaking())),
        "a narração continuou depois da escolha",
      );
      verificar(!servidor.falhas.length, `áudios que faltam: ${servidor.falhas.join(", ")}`);
      verificar(!erros.length, erros.join("; "));
      await context.close();
      await servidor.fechar();
      return `cena ${cena}`;
    },
  ],
];

process.exit((await executar("Testes de conquistas, jornadas e narração", casos)) ? 1 : 0);
