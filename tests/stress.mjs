/**
 * Testes de stress: volume de partidas, sessões longas, memória, desempenho da
 * animação e combate em massa.
 *
 * Uso: npm run test:stress
 */
import { abrirJogo, abrirNavegador, comecarJogo, verificar } from "./lib/harness.mjs";

const LIMITES = {
  partidas: Number(process.argv[2]) || 200,
  trocasDeCena: 3000,
  combates: 3000,
  crescimentoDeMemoriaMB: 25,
  crescimentoDeElementos: 200,
  tamanhoMaximoDoSaveKB: 200,
  quadroMedioMs: 16.7,
  quadrosLentosPct: 5,
  particulasDoVento: 75,
};

const browser = await abrirNavegador(["--enable-precise-memory-info", "--js-flags=--expose-gc"]);
const resultados = [];
let falhas = 0;

async function caso(nome, fn) {
  const inicio = Date.now();
  try {
    const detalhe = await fn();
    resultados.push({ nome, ok: true, detalhe, ms: Date.now() - inicio });
    console.log(`  ✓ ${nome} · ${detalhe} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  } catch (e) {
    falhas++;
    resultados.push({ nome, ok: false, detalhe: e.message });
    console.log(`  ✗ ${nome}\n      ${e.message}`);
  }
}

console.log("\nTestes de stress\n----------------");

await caso(`${LIMITES.partidas} partidas completas`, async () => {
  const { page, context, erros } = await abrirJogo(browser);
  const r = await page.evaluate((n) => {
    const out = { completas: 0, mortes: 0, travadas: 0, passos: 0, finais: {}, maiorSave: 0 };
    const t0 = performance.now();
    for (let run = 0; run < n; run++) {
      state = newChar("Stress", ["ferreiro", "pastor", "curandeira"][run % 3]);
      state.mode = "playing";
      migrate(state);
      go("c1_inicio");
      let i = 0;
      for (; i < 4000; i++) {
        if (state.dead) {
          out.mortes++;
          break;
        }
        if (state.scene === "c6_epilogo") {
          out.completas++;
          out.finais[state.flags.final] = (out.finais[state.flags.final] || 0) + 1;
          out.maiorSave = Math.max(out.maiorSave, JSON.stringify(state).length);
          break;
        }
        if (state.combat) {
          playerAttack("normal");
          continue;
        }
        const opcoes = visibleChoices(SC[state.scene]);
        const reais = opcoes.filter((c) => !c.act);
        if (!reais.length) break;
        choose(opcoes.indexOf(reais[Math.floor(Math.random() * reais.length)]));
      }
      out.passos += i;
      if (i >= 4000) out.travadas++;
    }
    out.msPorPartida = (performance.now() - t0) / n;
    return out;
  }, LIMITES.partidas);
  await context.close();
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(!r.travadas, `${r.travadas} partida(s) travaram`);
  verificar(r.completas + r.mortes === LIMITES.partidas, "nem toda partida terminou");
  verificar(
    r.maiorSave / 1024 < LIMITES.tamanhoMaximoDoSaveKB,
    `save grande demais: ${(r.maiorSave / 1024).toFixed(0)} KB`,
  );
  const finais = Object.entries(r.finais)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  return `${r.completas} completas, ${r.mortes} mortes, ${r.msPorPartida.toFixed(0)} ms por partida, maior save ${(r.maiorSave / 1024).toFixed(1)} KB; finais: ${finais}`;
});

await caso(`Sessão longa: ${LIMITES.trocasDeCena} trocas de cena com a tela desenhada`, async () => {
  const { page, context, erros } = await abrirJogo(browser);
  await comecarJogo(page);
  const medir = () =>
    page.evaluate(() => {
      window.gc?.();
      return { heap: performance.memory.usedJSHeapSize, nos: document.getElementsByTagName("*").length };
    });
  const antes = await medir();
  await page.evaluate((n) => {
    const cenas = Object.keys(SC);
    for (let i = 0; i < n; i++) {
      state.combat = null;
      go(cenas[i % cenas.length]);
    }
    go("c1_inicio");
  }, LIMITES.trocasDeCena);
  await page.waitForTimeout(500);
  const depois = await medir();
  await context.close();
  const crescimentoMB = (depois.heap - antes.heap) / 1048576;
  const crescimentoNos = depois.nos - antes.nos;
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(crescimentoMB < LIMITES.crescimentoDeMemoriaMB, `memória cresceu ${crescimentoMB.toFixed(1)} MB`);
  verificar(crescimentoNos < LIMITES.crescimentoDeElementos, `a página ganhou ${crescimentoNos} elementos`);
  return `memória ${(antes.heap / 1048576).toFixed(1)} → ${(depois.heap / 1048576).toFixed(1)} MB, elementos ${antes.nos} → ${depois.nos}`;
});

await caso("Desempenho da animação nas cenas mais pesadas", async () => {
  const { page, context, erros } = await abrirJogo(browser);
  await comecarJogo(page);
  const cenas = ["c1_chegada", "c2_lobos", "c3_cabeca", "c4_flechas", "c6_luta_final", "c1_vau"];
  const medidas = [];
  for (const cena of cenas) {
    await page.evaluate((id) => {
      state.combat = null;
      go(id);
    }, cena);
    await page.waitForTimeout(400);
    medidas.push(
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const tempos = [];
            let ultimo = performance.now();
            const passo = (agora) => {
              tempos.push(agora - ultimo);
              ultimo = agora;
              if (tempos.length < 120) requestAnimationFrame(passo);
              else resolve(tempos.slice(5));
            };
            requestAnimationFrame(passo);
          }),
      ),
    );
  }
  await context.close();
  const todos = medidas.flat();
  const media = todos.reduce((a, b) => a + b, 0) / todos.length;
  const lentos = (todos.filter((t) => t > 50).length / todos.length) * 100;
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(media < LIMITES.quadroMedioMs * 1.5, `quadro médio de ${media.toFixed(1)} ms`);
  verificar(lentos < LIMITES.quadrosLentosPct, `${lentos.toFixed(1)}% dos quadros passaram de 50 ms`);
  return `quadro médio ${media.toFixed(1)} ms (${(1000 / media).toFixed(0)} fps), ${lentos.toFixed(1)}% de quadros lentos`;
});

await caso(`${LIMITES.combates} combates contra grupos aleatórios`, async () => {
  const { page, context, erros } = await abrirJogo(browser);
  const r = await page.evaluate((n) => {
    const chaves = Object.keys(FOES);
    const out = { vitorias: 0, derrotas: 0, mortes: 0, invalidos: 0, rodadas: 0 };
    for (let i = 0; i < n; i++) {
      state = newChar("Stress", ["ferreiro", "pastor", "curandeira"][i % 3]);
      state.mode = "playing";
      migrate(state);
      state.techs = ["feroz", "finta", "atordoar", "folego"];
      state.sangue = 4;
      state.skills.sp_tempestade = 4;
      state.skills.sp_estacoes = 4;
      state.inv.fragmento = 1;
      state.amulet = "fragmento";
      state.scene = "c1_inicio";
      const grupo = Array.from({ length: 1 + (i % 3) }, (_, j) => chaves[(i * 7 + j * 13) % chaves.length]);
      startCombat({ e: grupo, allies: i % 2 ? [ALLY.tam] : [], win: "c1_visao", lose: "c1_desmaio" });
      let guarda = 0;
      while (state.combat && !state.dead && guarda++ < 300) {
        const acao = guarda % 7;
        if (acao === 0) playerTech("finta");
        else if (acao === 1 && state.fp >= 5) playerCast("sp_tempestade");
        else if (acao === 2 && !state.combat.used.amu) playerAmulet();
        else if (acao === 3) playerTech("feroz");
        else playerAttack(acao === 4 ? "allout" : "normal");
        if (state.combat && state.combat.foes.some((f) => !Number.isFinite(f.hp))) out.invalidos++;
      }
      out.rodadas += guarda;
      if (!Number.isFinite(state.hp) || !Number.isFinite(state.fp) || state.fp < 0) out.invalidos++;
      if (state.dead) out.mortes++;
      else if (state.scene === "c1_visao") out.vitorias++;
      else out.derrotas++;
    }
    return out;
  }, LIMITES.combates);
  await context.close();
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(!r.invalidos, `${r.invalidos} estados inválidos (vida ou fadiga não numérica)`);
  return `${r.vitorias} vitórias, ${r.derrotas} derrotas, ${r.mortes} mortes, ${(r.rodadas / LIMITES.combates).toFixed(1)} rodadas por luta`;
});

await caso("Vento guia: 500 passagens rápidas do cursor", async () => {
  const { page, context, erros } = await abrirJogo(browser);
  await comecarJogo(page);
  const escolhas = await page.$$(".choice");
  for (let i = 0; i < 500; i++) await escolhas[i % escolhas.length].hover({ force: true });
  const pico = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let maior = 0;
        const t0 = performance.now();
        const passo = () => {
          maior = Math.max(maior, WIND.particleCount());
          if (performance.now() - t0 < 1500) requestAnimationFrame(passo);
          else resolve(maior);
        };
        passo();
      }),
  );
  await context.close();
  verificar(!erros.length, `erro de execução: ${erros[0]}`);
  verificar(pico <= LIMITES.particulasDoVento, `${pico} partículas, acima do limite`);
  return `pico de ${pico} partículas (limite ${LIMITES.particulasDoVento})`;
});

await browser.close();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
