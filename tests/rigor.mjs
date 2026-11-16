/**
 * Testes rigorosos: o jogo como uma pessoa joga, no celular, por toques.
 *
 * Nasceram de um bug que os outros testes não pegavam: no iPhone, uma escolha ficava
 * "presa" porque o segundo toque virava zoom. Aqui nada é chamado por dentro do código
 * quando dá para usar a tela: os toques são reais, o jogo é servido por HTTP (como no
 * GitHub Pages, para enxergar arquivos que faltam) e qualquer erro, arquivo ausente ou
 * toque sem efeito reprova.
 *
 * Uso: npm run test:rigor
 */
import fs from "node:fs";
import path from "node:path";
import { abrirNavegador, servirJogo, verificar, RAIZ, SAVE_KEY } from "./lib/harness.mjs";

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

const servidor = await servirJogo();
const browser = await abrirNavegador();
let falhas = 0;

/** RIGOR_SO="trecho do nome" roda só os casos cujo nome contém o trecho. */
const SO = process.env.RIGOR_SO;

async function caso(nome, fn) {
  if (SO && !nome.includes(SO)) return;
  const inicio = Date.now();
  try {
    const detalhe = await fn();
    console.log(
      `  ✓ ${nome}${detalhe ? ` · ${detalhe}` : ""} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
    );
  } catch (e) {
    falhas++;
    console.log(`  ✗ ${nome}\n      ${String(e.message).split("\n").slice(0, 6).join("\n      ")}`);
  }
}

/**
 * Abre o jogo num "iPhone". `cinema` liga as cenas de luta; `rapido` emula "reduzir
 * movimento", que tira as esperas das animações (útil para varrer centenas de toques).
 */
async function abrirCelular({ cinema = false, rapido = false, antes } = {}) {
  const context = await browser.newContext({ ...IPHONE, reducedMotion: rapido ? "reduce" : "no-preference" });
  await context.addInitScript(
    ([modo]) => {
      try {
        localStorage.setItem("sen-cinema", JSON.stringify({ mode: modo }));
        localStorage.setItem("sen-audio", JSON.stringify({ music: false, sfx: false }));
      } catch {
        // Sem armazenamento: segue com os padrões.
      }
    },
    [cinema ? "completo" : "desligado"],
  );
  if (antes) await context.addInitScript(antes);
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(`erro: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon/.test(m.text())) erros.push(`console: ${m.text()}`);
  });
  page.on("requestfailed", (r) => {
    // Trocar de música interrompe o download da anterior: isso não é falha.
    if (!/\.mp3$/.test(new URL(r.url()).pathname)) erros.push(`rede: ${r.url()} ${r.failure()?.errorText}`);
  });
  await page.goto(servidor.url);
  await page.waitForTimeout(250);
  return { page, context, erros };
}

/** Um retrato do que está na tela e no estado, para saber se um toque teve efeito. */
const retrato = (page) =>
  page.evaluate(() => {
    const ov = document.getElementById("overlay");
    return JSON.stringify({
      s: typeof state !== "undefined" && state ? JSON.stringify(state) : null,
      ov: ov && !ov.hidden ? ov.innerHTML.length : 0,
      app: document.getElementById("app").innerHTML.length,
      cine: typeof CINEMA !== "undefined" && CINEMA.isPlaying(),
    });
  });

console.log(
  "\nTestes rigorosos (celular, toques reais, servidor HTTP)\n------------------------------------------------------",
);

// ---------------------------------------------------------------- arquivos

await caso("todo arquivo de imagem e música que o código cita existe", async () => {
  const { page, context, erros } = await abrirCelular();
  const lista = await page.evaluate(() => {
    const arquivos = [];
    for (const k of HERO_PORTRAITS) arquivos.push(`img/heroes/${k}.jpg`);
    for (const k of ACTION_SHOTS) arquivos.push(`img/action/${k}.jpg`);
    for (const k of ITEM_PAINTINGS) arquivos.push(`img/items/${k}.jpg`);
    for (const k of Object.keys(FOES)) arquivos.push(`img/portraits/${FOES[k].pic || k}.jpg`);
    const faixas = new Set(Object.keys(SC).map(trackFor));
    faixas.add("combate").add("combate_feerico").add("tema");
    for (const k of faixas) arquivos.push(`audio/${k}.mp3`);
    return [...new Set(arquivos)];
  });
  const faltando = lista.filter((a) => !fs.existsSync(path.join(RAIZ, a)));
  verificar(!faltando.length, `faltam ${faltando.length}: ${faltando.slice(0, 8).join(", ")}`);
  verificar(!erros.length, erros.join("; "));
  await context.close();
  return `${lista.length} arquivos`;
});

await caso("toda pintura de cena citada em META existe ou tem ilustração de reserva", async () => {
  const { page, context } = await abrirCelular();
  const chaves = await page.evaluate(() => [...new Set(Object.keys(SC).map((id) => meta(id)[0]))]);
  const semPintura = chaves.filter((k) => !fs.existsSync(path.join(RAIZ, `img/scenes/${k}.jpg`)));
  const semReserva = await page.evaluate((ks) => {
    const cv = document.createElement("canvas");
    const c = cv.getContext("2d");
    return ks.filter((k) => {
      try {
        ART.paintBackground(c, k, 1, {});
        return false;
      } catch {
        return true;
      }
    });
  }, semPintura);
  verificar(!semReserva.length, `cenas sem pintura e sem reserva: ${semReserva.join(", ")}`);
  await context.close();
  return `${chaves.length} pinturas, ${semPintura.length} desenhadas pelo código`;
});

// ---------------------------------------------------------------- toques

await caso("toda escolha visível de todas as cenas responde a UM toque", async () => {
  const { page, context, erros } = await abrirCelular({ rapido: true });
  const cenas = await page.evaluate(() => Object.keys(SC));
  const presas = [];
  const becos = [];
  let toques = 0;
  for (const id of cenas) {
    const base = await page.evaluate((id) => {
      state = newChar("Teste", "ferreiro");
      state.mode = "playing";
      migrate(state);
      state.coins = 200;
      state.mat = { ferro: 20, couro: 20, tecido: 20, prata: 20 };
      state.inv.ervas = 5;
      go(id);
      return { snap: JSON.stringify(state), n: document.querySelectorAll("#choices .choice").length };
    }, id);
    for (let i = 0; i < base.n; i++) {
      await page.evaluate((snap) => {
        closeEvolve();
        state = migrate(JSON.parse(snap));
        CHECK = snap;
        render();
      }, base.snap);
      // Se um filme estiver passando (o trailer do final), a pessoa toca nele para pular,
      // como faria de verdade, e só então escolhe.
      if (await page.evaluate(() => CINEMA.isPlaying())) {
        await page.locator("#cinema").tap({ position: { x: 20, y: 20 } });
        await page.waitForTimeout(500);
        verificar(!(await page.evaluate(() => CINEMA.isPlaying())), `o toque não pulou o filme em ${id}`);
      }
      const antes = await retrato(page);
      const botao = page.locator(`#choices .choice[data-i="${i}"]`);
      if (!(await botao.count())) continue;
      await botao.scrollIntoViewIfNeeded();
      await botao.tap();
      toques++;
      await page.waitForTimeout(30);
      const depois = await retrato(page);
      if (antes === depois) presas.push(`${id}#${i}`);
      const saida = await page.evaluate(() => {
        const ov = document.getElementById("overlay");
        return (
          document.querySelectorAll("#choices .choice, #aAtk, #retry, #bNew, #eOk, #dClose").length > 0 ||
          (ov && !ov.hidden)
        );
      });
      if (!saida) becos.push(`${id}#${i}`);
    }
  }
  verificar(
    !presas.length,
    `escolhas que não respondem a um toque (${presas.length}): ${presas.slice(0, 12).join(", ")}`,
  );
  verificar(!becos.length, `escolhas que levam a uma tela sem saída: ${becos.slice(0, 12).join(", ")}`);
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
  return `${cenas.length} cenas, ${toques} toques`;
});

await caso("partidas inteiras só com toques, cinema ligado e pulado com toque", async () => {
  const resumo = [];
  const partidas = Number(process.env.RIGOR_PARTIDAS) || 4;
  for (let partida = 0; partida < partidas; partida++) {
    const { page, context, erros } = await abrirCelular({ cinema: true });
    await page.locator("#bNew").tap();
    await page
      .locator(".look")
      .nth(partida % 4)
      .tap();
    await page
      .locator(".origin")
      .nth(partida % 3)
      .tap();
    await page.locator("#bNext").tap();
    await page.locator("#eOk").tap();
    let semEfeito = 0;
    let toques = 0;
    let fim = "limite";
    for (; toques < 700; toques++) {
      const antes = await retrato(page);
      const tela = await page.evaluate(() => {
        if (CINEMA.isPlaying()) return "cinema";
        const ov = document.getElementById("overlay");
        if (ov && !ov.hidden) return "overlay";
        if (state?.dead) return "morte";
        if (!state || state.mode !== "playing") return "titulo";
        if (state.combat) return "combate";
        return "cena";
      });
      if (tela === "titulo" || tela === "morte") {
        fim = tela;
        break;
      }
      if (await page.evaluate(() => state.scene === "c6_epilogo")) {
        fim = "epílogo";
        break;
      }
      if (tela === "cinema") await page.locator("#cinema").tap({ position: { x: 20, y: 20 } });
      else if (tela === "overlay") {
        const fechar = page.locator("#eOk, #dClose, #mClose").first();
        await fechar.tap();
      } else if (tela === "combate") {
        const acoes = page.locator("#aAtk, #aAll, #aDef");
        await acoes.nth(Math.floor(Math.random() * 3)).tap();
      } else {
        // Quem joga até o fim não abandona a partida no meio para começar outra.
        const escolhas = page.locator("#choices .choice").filter({ hasNotText: "nova jornada" });
        const n = await escolhas.count();
        const alvo = escolhas.nth(Math.floor(Math.random() * n));
        await alvo.scrollIntoViewIfNeeded();
        await alvo.tap();
      }
      await page.waitForTimeout(tela === "cena" ? 520 : 60);
      semEfeito = antes === (await retrato(page)) ? semEfeito + 1 : 0;
      if (semEfeito >= 4)
        throw new Error(
          `partida ${partida + 1}: ${semEfeito} toques seguidos sem efeito (${tela}, cena ${await page.evaluate(() => state?.scene)})`,
        );
    }
    const cena = await page.evaluate(() => state?.scene);
    verificar(!erros.length, `partida ${partida + 1}: ${erros.slice(0, 4).join("; ")}`);
    resumo.push(`${cena} (${fim}, ${toques} toques)`);
    await context.close();
  }
  return resumo.join(" | ");
});

// ---------------------------------------------------------------- tela do personagem

await caso("tela do personagem: todas as abas, itens, vestir, empunhar, forjar e fechar", async () => {
  const { page, context, erros } = await abrirCelular();
  await page.evaluate(() => {
    state = newChar("Teste", "ferreiro");
    state.mode = "playing";
    migrate(state);
    state.coins = 500;
    state.mat = { ferro: 50, couro: 50, tecido: 50, prata: 50 };
    state.outfits = Object.keys(ARMOR);
    state.weapons = Object.keys(WEAPONS);
    for (const k of Object.keys(AMULETS)) state.inv[k] = 1;
    go("c1_inicio");
    CINEMA.stop();
  });
  let acoes = 0;
  for (const aba of ["roupa", "arma", "amuleto"]) {
    await page.evaluate((a) => openChar(a), aba);
    const n = await page.locator(".tile").count();
    for (let i = 0; i < n; i++) {
      await page.locator(".tile").nth(i).tap();
      acoes++;
      const eq = page.locator("#dEq:not([disabled])");
      if (await eq.count()) {
        await eq.tap();
        acoes++;
      }
      for (let f = 0; f < 3; f++) {
        const up = page.locator("#dUp:not([disabled])");
        if (!(await up.count())) break;
        await up.tap();
        acoes++;
      }
    }
    // Toda imagem da tela precisa carregar de verdade.
    await page.waitForTimeout(400);
    const quebradas = await page.evaluate(() =>
      [...document.querySelectorAll("#overlay img")]
        .filter((im) => im.complete && !im.naturalWidth)
        .map((im) => im.src),
    );
    verificar(!quebradas.length, `imagens quebradas na aba ${aba}: ${quebradas.join(", ")}`);
  }
  await page.locator("#dClose").tap();
  verificar(
    await page.evaluate(() => document.getElementById("overlay").hidden),
    "a tela do personagem não fechou",
  );
  verificar(await page.locator("#choices .choice").count(), "depois de fechar, a cena não tem escolhas");
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
  return `${acoes} toques`;
});

await caso("evolução: gastar pontos e voltar, por toques", async () => {
  const { page, context, erros } = await abrirCelular();
  await page.locator("#bNew").tap();
  await page.locator("#bNext").tap();
  // A cada ponto gasto a tela se refaz e alguns botões "+" ficam desativados: pega sempre o primeiro ativo.
  const mais = page.locator("#overlay button:not([disabled])", { hasText: "+" });
  for (let i = 0; i < 6 && (await mais.count()); i++) await mais.first().tap();
  await page.locator("#eOk").tap();
  await page.waitForTimeout(200);
  const ok = await page.evaluate(
    () => state?.mode === "playing" && document.getElementById("overlay").hidden,
  );
  verificar(ok, "a criação não terminou depois de confirmar");
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
});

await caso("gastar pontos ou escolher um item lá embaixo não joga a tela de volta para o topo", async () => {
  const { page, context, erros } = await abrirCelular();
  await page.evaluate(() => {
    state = newChar("Teste", "curandeira");
    state.mode = "playing";
    migrate(state);
    state.unspent = 200;
    state.outfits = Object.keys(ARMOR);
    state.weapons = Object.keys(WEAPONS);
    go("c1_inicio");
    CINEMA.stop();
    openEvolve();
  });
  const problemas = [];
  // Aprendizados: o último "+" ativo fica bem abaixo da dobra no celular.
  for (let i = 0; i < 3; i++) {
    const mais = page.locator("#overlay button.pm:not([disabled])", { hasText: "+" }).last();
    await mais.scrollIntoViewIfNeeded();
    const antes = await page.evaluate(() => document.getElementById("overlay").scrollTop);
    await mais.tap();
    await page.waitForTimeout(150);
    const depois = await page.evaluate(() => document.getElementById("overlay").scrollTop);
    if (antes > 200 && Math.abs(depois - antes) > 40)
      problemas.push(`Aprendizados: rolagem ${antes} → ${depois}`);
  }
  // Tela do personagem: tocar num item lá embaixo.
  await page.evaluate(() => {
    closeEvolve();
    openChar("arma");
  });
  const tiles = page.locator(".tile");
  const ultimo = tiles.nth((await tiles.count()) - 1);
  await ultimo.scrollIntoViewIfNeeded();
  const antes = await page.evaluate(() => document.getElementById("overlay").scrollTop);
  await ultimo.tap();
  await page.waitForTimeout(150);
  const depois = await page.evaluate(() => document.getElementById("overlay").scrollTop);
  if (antes > 200 && Math.abs(depois - antes) > 40)
    problemas.push(`Personagem: rolagem ${antes} → ${depois}`);
  verificar(antes > 200, `o teste não conseguiu rolar a tela do personagem (${antes})`);
  verificar(!problemas.length, problemas.join("; "));
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
});

// ---------------------------------------------------------------- cinema

await caso("cinema: os 20 inimigos em todos os resultados, sem erro e sempre fechando", async () => {
  const { page, context, erros } = await abrirCelular({ cinema: true });
  await page.evaluate(() => {
    state = newChar("Teste", "ferreiro");
    state.mode = "playing";
    migrate(state);
    go("c1_inicio");
    CINEMA.stop();
  });
  const r = await page.evaluate(async () => {
    const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const pics = [...new Set(Object.entries(FOES).map(([k, f]) => f.pic || k))];
    const tomadas = [
      {
        type: "strike",
        by: "hero",
        foe: 0,
        outcome: "hit",
        kind: "cut",
        dmg: 5,
        crit: true,
        killed: true,
        roll: { dice: [1, 1, 2], sum: 4, target: 12 },
      },
      {
        type: "strike",
        by: "hero",
        foe: 0,
        outcome: "miss",
        kind: "arrow",
        roll: { dice: [6, 6, 5], sum: 17, target: 12 },
      },
      { type: "strike", by: "hero", foe: 0, outcome: "parry", kind: "imp" },
      { type: "strike", by: "foe", foe: 0, outcome: "hit", dmg: 3, crit: true },
      { type: "strike", by: "foe", foe: 0, outcome: "dodge" },
      { type: "strike", by: "foe", foe: 0, outcome: "parry" },
      { type: "strike", by: "foe", foe: 0, outcome: "block" },
      { type: "strike", by: "foe", foe: 0, outcome: "miss" },
      { type: "strike", by: "foe", foe: 0, outcome: "stunned" },
      { type: "ally", name: "Tam", foe: 0, outcome: "hit", dmg: 2, killed: false },
      { type: "spell", key: "sp_beltane", foe: 0, outcome: "ok", dmg: 4, heal: 0, all: [{ foe: 0, dmg: 4 }] },
      {
        type: "spell",
        key: "sp_tempestade",
        foe: 0,
        outcome: "ok",
        dmg: 4,
        heal: 0,
        all: [{ foe: 0, dmg: 4 }],
      },
      { type: "spell", key: "sp_cura", foe: 0, outcome: "fail" },
      { type: "heal", source: "ervas", amount: 3 },
      { type: "guard" },
      { type: "feint", foe: 0, ok: true },
      { type: "amulet", key: "sorveira" },
      { type: "flee", ok: false },
      { type: "end", result: "win" },
    ];
    let filmes = 0;
    const presos = [];
    for (const pic of pics) {
      const k = Object.keys(FOES).find((x) => (FOES[x].pic || x) === pic);
      runOutcome({ e: [k], win: "c1_inicio", lose: "c1_inicio" });
      CINEMA.begin(state.combat);
      tomadas.forEach((t) => CINEMA.shot({ ...t }));
      CINEMA.end();
      if (CINEMA.isPlaying()) filmes++;
      await espera(700);
      CINEMA.stop();
      if (!document.getElementById("cinema").hidden) presos.push(pic);
      state.combat = null;
    }
    return { pics: pics.length, filmes, presos };
  });
  verificar(r.filmes === r.pics, `só ${r.filmes} de ${r.pics} inimigos viraram filme`);
  verificar(!r.presos.length, `a camada do cinema ficou presa: ${r.presos.join(", ")}`);
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
  return `${r.pics} inimigos × 19 tomadas`;
});

await caso("o cinema nunca prende a tela: sem toque, ele fecha sozinho a tempo", async () => {
  const { page, context, erros } = await abrirCelular({ cinema: true });
  await page.evaluate(() => {
    state = newChar("Teste", "ferreiro");
    state.mode = "playing";
    migrate(state);
    go("c1_inicio");
    CINEMA.stop();
    runOutcome({ e: ["recruta", "recruta", "recruta"], win: "c1_inicio", lose: "c1_inicio" });
  });
  await page.locator("#aAtk").tap();
  verificar(await page.evaluate(() => CINEMA.isPlaying()), "o cinema não começou");
  await page.waitForFunction(() => !CINEMA.isPlaying(), null, { timeout: 26000 });
  verificar(await page.locator("#aAtk, #choices .choice").count(), "depois do cinema, não há o que tocar");
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
});

// ---------------------------------------------------------------- telas pequenas

await caso("nada vaza para os lados numa tela de 320 px", async () => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() =>
    localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" })),
  );
  const page = await context.newPage();
  await page.goto(servidor.url);
  const telas = {
    titulo: () => {},
    criacao: () => renderOriginPick(),
    cena: () => {
      state = newChar("Teste", "ferreiro");
      state.mode = "playing";
      migrate(state);
      go("c3_intendente");
    },
    combate: () =>
      runOutcome({
        e: ["recruta", "cao", "kelpie"],
        allies: [{ n: "Tam", skill: 12, dmg: "1d+1", type: "cut" }],
        win: "c1_inicio",
        lose: "c1_inicio",
      }),
    personagem: () => {
      state.combat = null;
      render();
      openChar("arma");
    },
    menu: () => {
      closeEvolve();
      openMenu();
    },
  };
  const vazam = [];
  for (const [nome, abrir] of Object.entries(telas)) {
    await page.evaluate(`(${abrir.toString()})()`);
    await page.waitForTimeout(300);
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    if (largura > 321) vazam.push(`${nome} (${largura} px)`);
  }
  verificar(!vazam.length, `telas mais largas que 320 px: ${vazam.join(", ")}`);
  await context.close();
});

// ---------------------------------------------------------------- saves

await caso("3.000 saves corrompidos ao acaso não quebram o jogo", async () => {
  const { page, context, erros } = await abrirCelular();
  const r = await page.evaluate(() => {
    let semente = 7;
    const aleatorio = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
    const lixo = () => {
      const opcoes = [
        null,
        undefined,
        -1,
        1e308,
        NaN,
        "",
        "<img src=x onerror=alert(1)>",
        "__proto__",
        [],
        {},
        true,
        "c9_nada",
        { __proto__: { x: 1 } },
        "constructor",
      ];
      return opcoes[Math.floor(aleatorio() * opcoes.length)];
    };
    const base = newChar("Base", "pastor");
    base.mode = "playing";
    base.armor = "malha";
    base.journey = [{ ch: 1, armor: "la", weapon: "funda", wl: 0, amulet: null, sangue: 0, hpMax: 10 }];
    const caminhos = [];
    const percorrer = (o, p) => {
      for (const k of Object.keys(o)) {
        caminhos.push([...p, k]);
        if (o[k] && typeof o[k] === "object") percorrer(o[k], [...p, k]);
      }
    };
    percorrer(base, []);
    let quebrou = 0;
    let aceitos = 0;
    const exemplos = [];
    for (let n = 0; n < 3000; n++) {
      const save = JSON.parse(JSON.stringify(base));
      const mudancas = 1 + Math.floor(aleatorio() * 4);
      for (let m = 0; m < mudancas; m++) {
        const c = caminhos[Math.floor(aleatorio() * caminhos.length)];
        let alvo = save;
        for (const k of c.slice(0, -1)) alvo = alvo && typeof alvo === "object" ? alvo[k] : null;
        if (alvo && typeof alvo === "object") alvo[c.at(-1)] = lixo();
      }
      try {
        const limpo = sanitizeSave(JSON.parse(JSON.stringify(save)));
        if (limpo) {
          aceitos++;
          state = limpo;
          migrate(state);
          render();
          openChar("roupa");
          closeEvolve();
        }
      } catch (e) {
        quebrou++;
        if (exemplos.length < 3) exemplos.push(`${e.message} :: ${JSON.stringify(save).slice(0, 160)}`);
      }
    }
    return {
      quebrou,
      aceitos,
      exemplos,
      poluiu: {}.x !== undefined || Object.prototype.polluted !== undefined,
    };
  });
  verificar(!r.quebrou, `${r.quebrou} saves quebraram o jogo. Ex.: ${r.exemplos.join(" | ")}`);
  verificar(!r.poluiu, "um save poluiu o protótipo de Object");
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
  return `${r.aceitos} aceitos depois de limpos`;
});

await caso("save gravado na versão anterior (sem aparência nem galeria) continua jogável", async () => {
  const antigo = {
    name: "Velho",
    origin: "ferreiro",
    attrs: { ST: 11, DX: 10, IQ: 10, HT: 11 },
    skills: { machado: 2 },
    adv: [],
    weapons: ["martelo", "punhos"],
    weapon: "martelo",
    armor: "gibao",
    shield: true,
    inv: { ervas: 1 },
    coins: 3,
    outfits: ["la", "gibao"],
    techs: [],
    mat: { ferro: 1 },
    up: {},
    amulet: null,
    unspent: 0,
    earned: 11,
    sangue: 0,
    flags: {},
    visited: { c1_inicio: 1 },
    scene: "c3_intendente",
    mode: "playing",
    hp: 12,
    fp: 10,
  };
  const { page, context, erros } = await abrirCelular({
    antes: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(antigo))})`,
  });
  await page.locator("#bCont").tap();
  await page.waitForTimeout(300);
  const cena = await page.evaluate(() => [state.scene, state.look, Array.isArray(state.journey)]);
  verificar(cena[0] === "c3_intendente" && cena[1] && cena[2], `save antigo carregou errado: ${cena}`);
  await page.locator("#choices .choice", { hasText: "Partir em missão" }).tap();
  await page.waitForTimeout(600);
  verificar((await page.evaluate(() => state.scene)) === "c3_missao", "o save antigo ficou preso na loja");
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
});

await caso("o toque que pula o cinema não atravessa e aciona o botão de baixo", async () => {
  const { page, context, erros } = await abrirCelular({ cinema: true });
  await page.evaluate(() => {
    state = newChar("Teste", "ferreiro");
    state.mode = "playing";
    migrate(state);
    go("c1_inicio");
    CINEMA.stop();
    runOutcome({ e: ["recruta", "recruta", "recruta"], win: "c1_inicio", lose: "c1_inicio" });
    state.hp = 999;
  });
  let atravessou = 0;
  for (let i = 0; i < 6; i++) {
    const botao = await page.locator("#aAtk").boundingBox();
    await page.locator("#aAtk").tap();
    const rodada = await page.evaluate(() => state.combat?.round);
    verificar(await page.evaluate(() => CINEMA.isPlaying()), "o cinema não começou");
    await page.waitForTimeout(200 + i * 150);
    // Toca exatamente onde fica o botão de ataque, por baixo do cinema.
    await page.touchscreen.tap(botao.x + botao.width / 2, botao.y + botao.height / 2);
    await page.waitForTimeout(400);
    const depois = await page.evaluate(() => state.combat?.round);
    if (depois !== rodada) atravessou++;
    if (!(await page.locator("#aAtk").count())) break;
  }
  verificar(!atravessou, `${atravessou} toque(s) para pular o cinema também atacaram de novo`);
  verificar(!erros.length, erros.slice(0, 5).join("; "));
  await context.close();
});

await caso("nenhum texto do jogo diz que um capítulo que já existe está em preparação", async () => {
  const { page, context } = await abrirCelular();
  const achados = await page.evaluate(() => {
    state = newChar("Teste", "ferreiro");
    state.mode = "playing";
    migrate(state);
    const out = [];
    for (const [id, sc] of Object.entries(SC)) {
      let texto;
      try {
        texto = typeof sc.text === "function" ? sc.text() : String(sc.text || "");
      } catch {
        continue;
      }
      if (/em prepara[çc][ãa]o|em breve|ainda n[ãa]o (existe|foi escrit)/i.test(texto)) out.push(id);
    }
    return out;
  });
  verificar(!achados.length, `textos desatualizados em: ${achados.join(", ")}`);
  await context.close();
});

// ---------------------------------------------------------------- rede

await caso("nenhum arquivo pedido pelo jogo falta no servidor", async () => {
  verificar(
    !servidor.falhas.length,
    `arquivos pedidos que não existem: ${[...new Set(servidor.falhas)].slice(0, 10).join(", ")}`,
  );
  return "0 erros 404";
});

await browser.close();
await servidor.fechar();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
