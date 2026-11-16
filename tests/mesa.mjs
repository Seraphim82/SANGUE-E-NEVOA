/**
 * Testes do Modo Mesa local: 2 a 4 heróis no mesmo aparelho.
 *
 * Uso: npm run test:mesa
 */
import { abrirJogo, abrirNavegador, executar, servirJogo, verificar, SAVE_KEY } from "./lib/harness.mjs";

/** Cria uma mesa de `n` heróis pela tela de criação. */
async function criarMesa(page, nomes = ["Rowan", "Ailsa", "Callum"]) {
  await page.click("#bMesa");
  while ((await page.locator(".mesa-linha").count()) < nomes.length) await page.click("#mMais");
  while ((await page.locator(".mesa-linha").count()) > nomes.length) await page.click("#mMenos");
  for (let i = 0; i < nomes.length; i++) await page.fill(`input[data-i="${i}"][data-campo="nome"]`, nomes[i]);
  await page.click("#mComecar");
  await page.waitForTimeout(250);
  await page.evaluate(() => CINEMA.stop());
}

/** Uma cena com pelo menos duas escolhas simples (só "go", destinos diferentes). */
const cenaSimples = () =>
  Object.keys(SC).find((id) => {
    const cs = SC[id].choices;
    return (
      cs.length >= 2 &&
      cs.every((c) => typeof c.go === "string" && !c.test && !c.fx && !c.fight && !c.act && !c.if) &&
      new Set(cs.map((c) => c.go)).size === cs.length
    );
  });

const casos = [
  [
    "criar uma mesa de 3 heróis pela interface",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page, ["Mairi", "Tam", "Ailsa"]);
      const r = await page.evaluate(() => ({
        mesa: inMesa(),
        nomes: state.mesa.heroes.map((h, i) => (i === state.mesa.active ? state.name : h.name)),
        cena: state.scene,
        pontos: state.mesa.heroes.map((h) => h.unspent),
        slot: slotInfo(activeSlot),
      }));
      verificar(r.mesa && r.nomes.join() === "Mairi,Tam,Ailsa", `mesa criada: ${JSON.stringify(r)}`);
      verificar(r.cena === "c1_inicio", `cena inicial: ${r.cena}`);
      verificar(
        r.pontos.every((p) => p === 10),
        `pontos livres: ${r.pontos}`,
      );
      verificar(r.slot && r.slot.mesa === 3, `espaço salvo não mostra a mesa: ${JSON.stringify(r.slot)}`);
      verificar(await page.locator(".mesa-chip").count(), "a faixa dos heróis não aparece");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "votação: vence a maioria; empate decide o mestre",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page, ["A", "B", "C"]);
      const id = await page.evaluate(cenaSimples);
      verificar(id, "nenhuma cena simples para testar a votação");
      const destinos = await page.evaluate((id) => SC[id].choices.map((c) => c.go), id);
      const votar = async (indices) => {
        await page.evaluate((id) => {
          resetVotes();
          go(id);
        }, id);
        for (const i of indices) await page.evaluate((i) => choose(i), i);
        return page.evaluate(() => state.scene);
      };
      verificar((await votar([1, 0, 1])) === destinos[1], "a maioria (2 de 3) não venceu");
      // Mesa de 4 com empate 2 x 2: vale o voto do mestre (herói 1).
      await page.evaluate(() => {
        const extra = newChar("D", "pastor");
        extra.mode = "playing";
        state.mesa.heroes.push(pickPersonal(migrate(extra)));
      });
      verificar((await votar([0, 1, 1, 0])) === destinos[0], "no empate, o voto do mestre não decidiu");
      verificar((await votar([1, 0, 0, 1])) === destinos[1], "no empate, o voto do mestre não decidiu (2)");
      // Enquanto falta voto, a cena não muda e a contagem aparece.
      await page.evaluate((id) => go(id), id);
      await page.locator('#choices .choice[data-i="0"]').click();
      await page.waitForTimeout(600);
      verificar((await page.evaluate(() => state.scene)) === id, "a cena mudou antes de todos votarem");
      verificar(await page.locator("#choices .tag.votos").count(), "a contagem de votos não aparece");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "teste de grupo: 2 de 3 acertos passa; 1 de 3 falha; os dados de todos aparecem",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page);
      const r = await page.evaluate(() => {
        const id = Object.keys(SC).find((x) => {
          const cs = SC[x].choices;
          return (
            cs.length &&
            cs.every((c) => !c.if) &&
            cs[0].test &&
            typeof cs[0].test.ok === "string" &&
            typeof cs[0].test.fail === "string" &&
            cs[0].test.ok !== cs[0].test.fail
          );
        });
        const ch = SC[id].choices[0];
        const real = test;
        const rodar = (seq) => {
          let n = 0;
          test = (t) => {
            const ok = seq[n++ % seq.length];
            return {
              ok,
              critOk: false,
              critFail: false,
              dice: ok ? [1, 2, 3] : [6, 6, 5],
              sum: ok ? 6 : 17,
              target: t,
              margin: ok ? t - 6 : t - 17,
            };
          };
          resetVotes();
          go(id);
          for (let i = 0; i < mesaSize(); i++) choose(0);
          test = real;
          return { cena: state.scene, roll: state.banner?.roll };
        };
        const passa = rodar([true, true, false]);
        const falha = rodar([true, false, false]);
        return { okDest: ch.test.ok, failDest: ch.test.fail, passa, falha };
      });
      verificar(r.passa.cena === r.okDest, `2 de 3 acertos deveria passar: ${r.passa.cena}`);
      verificar(r.falha.cena === r.failDest, `1 de 3 acertos deveria falhar: ${r.falha.cena}`);
      verificar(r.passa.roll?.group?.length === 3, "o banner não mostra os dados dos 3 heróis");
      verificar(await page.locator(".roll-heroi").count(), "a tela não mostra os dados do grupo");
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "compras são de cada herói e não passam por votação",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page);
      await page.evaluate(() => {
        forEachHero(() => {
          state.coins = 20;
          state.mat.ferro = 0;
        });
        go("c3_intendente");
      });
      await page.locator('.mesa-chip[data-heroi="1"]').click();
      await page.locator("#choices .choice", { hasText: "barras de ferro" }).click();
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => ({
        ativo: state.mesa.active,
        ferro: [0, 1, 2].map((i) =>
          i === state.mesa.active ? state.mat.ferro : state.mesa.heroes[i].mat.ferro,
        ),
        moedas: [0, 1, 2].map((i) => (i === state.mesa.active ? state.coins : state.mesa.heroes[i].coins)),
        votos: Object.keys(state.mesa.votes).length,
        cena: state.scene,
      }));
      verificar(
        r.ativo === 1 && r.ferro.join() === "0,2,0" && r.moedas.join() === "20,15,20",
        `compra errada: ${JSON.stringify(r)}`,
      );
      verificar(
        r.votos === 0 && r.cena === "c3_intendente",
        `a compra passou por votação: ${JSON.stringify(r)}`,
      );
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "combate: cada herói age uma vez por rodada e os inimigos atacam heróis diferentes",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page);
      const r = await page.evaluate(() => {
        forEachHero(() => {
          state.hp = 200;
        });
        runOutcome({
          e: ["recruta", "recruta", "recruta", "recruta"],
          hp: [999, 999, 999, 999],
          win: "c1_inicio",
          lose: "c1_inicio",
        });
        const vezes = [];
        const alvos = new Set();
        // Anota o herói ativo cada vez que um inimigo ataca: é o alvo daquele golpe.
        const golpeReal = foeStrike;
        foeStrike = (C, f) => {
          alvos.add(state.mesa.active);
          return golpeReal(C, f);
        };
        for (let k = 0; k < 15 && state.combat; k++) {
          vezes.push(`${state.combat.round}:${state.mesa.active}`);
          playerTotalDef();
        }
        foeStrike = golpeReal;
        return { vezes, alvos: [...alvos] };
      });
      const r1 = r.vezes.filter((v) => v.startsWith("1:")).map((v) => v.split(":")[1]);
      verificar(r1.join() === "0,1,2", `ordem da rodada 1: ${r1}`);
      verificar(r.vezes.filter((v) => v.startsWith("2:")).length === 3, `rodada 2: ${r.vezes}`);
      verificar(r.alvos.length >= 2, `os inimigos só atacaram ${r.alvos.length} herói(s)`);
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "combate: a luta só é perdida quando todos caem, e ninguém morre de vez",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page);
      const r = await page.evaluate(() => {
        const real = test;
        // O inimigo (ataque 99) sempre acerta; defesas e testes de HT (alvos baixos) sempre falham.
        test = (t) => ({
          ok: t > 50,
          critOk: false,
          critFail: false,
          dice: [6, 6, 6],
          sum: 18,
          target: t,
          margin: t - 18,
        });
        const cena = state.scene;
        runOutcome({ e: ["recruta"], hp: [999], win: "c1_inicio", lose: "c2_inicio" });
        forEachHero((i) => {
          state.hp = i === 0 ? 1 : 30;
        });
        state.combat.foes[0].atk = 99;
        state.combat.foes[0].dmg = "4d";
        const quedas = [];
        let guarda = 0;
        while (state.combat && guarda++ < 60) {
          quedas.push((state.combat.down || []).filter(Boolean).length);
          playerTotalDef();
        }
        test = real;
        const hp = [0, 1, 2].map((i) => (i === state.mesa.active ? state.hp : state.mesa.heroes[i].hp));
        return { cena: state.scene, saiu: cena !== state.scene, dead: !!state.dead, hp, quedas };
      });
      verificar(r.cena === "c2_inicio", `a derrota não levou à cena de perda: ${r.cena}`);
      verificar(
        r.quedas.some((q) => q > 0 && q < 3),
        `a luta acabou antes de todos caírem: ${r.quedas}`,
      );
      verificar(!r.dead, "um herói morreu de vez na Mesa");
      verificar(
        r.hp.every((h) => h >= 1),
        `heróis com PV abaixo de 1 depois da luta: ${r.hp}`,
      );
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "recompensas: pontos, itens, moedas e dano da história valem para cada herói",
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await criarMesa(page);
      const r = await page.evaluate(() => {
        const antes = [];
        forEachHero(() => antes.push({ e: state.earned, c: state.coins }));
        state.banner = null;
        gain(5, "Teste");
        giveItem("sorveira");
        givePennies(7);
        giveWeapon("espada");
        hurt("1d", "Teste");
        const depois = [];
        forEachHero(() =>
          depois.push({
            e: state.earned,
            c: state.coins,
            sorveira: state.inv.sorveira,
            espada: state.weapons.includes("espada"),
          }),
        );
        return { antes, depois, linhas: state.banner.lines.map((l) => l.t) };
      });
      r.depois.forEach((d, i) => {
        verificar(
          d.e === r.antes[i].e + 5 && d.c === r.antes[i].c + 7 && d.sorveira === 1 && d.espada,
          `herói ${i}: ${JSON.stringify(d)}`,
        );
      });
      verificar(
        r.linhas.filter((l) => l.startsWith("+5 PP")).length === 1,
        `linha de pontos repetida: ${r.linhas}`,
      );
      verificar(!erros.length, erros.join("; "));
      await context.close();
    },
  ],
  [
    "save: a mesa volta inteira ao recarregar, e exporta e importa em outro aparelho",
    async (browser) => {
      const servidor = await servirJogo();
      const abrir = async () => {
        const context = await browser.newContext();
        await context.addInitScript(() => {
          localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" }));
          localStorage.setItem("sen-narracao", JSON.stringify({ on: false }));
        });
        const page = await context.newPage();
        await page.goto(servidor.url);
        return { context, page };
      };
      const a = await abrir();
      await criarMesa(a.page, ["Um", "Dois", "Tres"]);
      await a.page.evaluate(() => {
        switchHero(2);
        state.coins = 42;
        save();
      });
      await a.page.reload();
      await a.page.click("#bCont");
      const r1 = await a.page.evaluate(() => ({
        n: mesaSize(),
        ativo: state.mesa.active,
        moedas: state.coins,
        nomes: [0, 1, 2].map((i) => mesaName(i)),
      }));
      verificar(
        r1.n === 3 && r1.ativo === 2 && r1.moedas === 42 && r1.nomes.join() === "Um,Dois,Tres",
        `mesa recarregada: ${JSON.stringify(r1)}`,
      );
      const codigo = await a.page.evaluate(() => exportCode(activeSlot));
      await a.context.close();
      const b = await abrir();
      await b.page.click("#bSlots");
      await b.page.fill("#impCode", codigo);
      await b.page.click("#impOk");
      const r2 = await b.page.evaluate(() => {
        const c = loadSave(1);
        return c && c.mesa ? c.mesa.heroes.map((h) => h.name).join() : null;
      });
      verificar(r2 === "Um,Dois,Tres", `mesa importada: ${r2}`);
      await b.context.close();
      await servidor.fechar();
    },
  ],
  [
    "save adulterado: mesa inválida é descartada sem erro e sem executar HTML",
    async (browser) => {
      const heroi = (nome) => ({ name: nome, origin: "pastor", attrs: { ST: 10, DX: 12, IQ: 10, HT: 11 } });
      const base = { name: "Lider", origin: "ferreiro", mode: "playing", scene: "c1_inicio" };
      const casosSave = {
        demais: { ...base, mesa: { heroes: [1, 2, 3, 4, 5, 6].map((i) => heroi(`H${i}`)), active: 0 } },
        um: { ...base, mesa: { heroes: [heroi("So")], active: 0 } },
        indices: {
          ...base,
          mesa: {
            heroes: [heroi("A"), heroi("B")],
            active: 99,
            voter: -3,
            votes: { 7: "x", 1.5: "y", 0: 5 },
          },
        },
        proto: {
          ...base,
          mesa: JSON.parse(
            '{"heroes":[{"__proto__":{"polluted":1},"name":"P","origin":"pastor"},{"name":"Q","origin":"pastor"}],"active":0}',
          ),
        },
        html: {
          ...base,
          mesa: {
            heroes: [heroi('<img src=x onerror="window.__xss=1">'), heroi("<svg onload=window.__xss=1>")],
            active: 0,
          },
        },
        origemFalsa: { ...base, mesa: { heroes: [heroi("A"), { name: "B", origin: "dragao" }], active: 0 } },
      };
      const resultados = {};
      for (const [nome, save] of Object.entries(casosSave)) {
        const { page, context, erros } = await abrirJogo(browser, {
          antes: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))})`,
        });
        await page.click("#bCont");
        await page.waitForTimeout(200);
        resultados[nome] = await page.evaluate(() => ({
          mesa: inMesa() ? mesaSize() : 0,
          ativo: inMesa() ? state.mesa.active : -1,
          voter: inMesa() ? state.mesa.voter : -1,
          votos: inMesa() ? Object.keys(state.mesa.votes) : [],
          xss: !!window.__xss,
          poluiu: {}.polluted !== undefined,
          nome: state.name,
        }));
        verificar(!erros.length, `${nome}: ${erros.join("; ")}`);
        await context.close();
      }
      verificar(
        resultados.demais.mesa === 0 && resultados.um.mesa === 0,
        `mesas fora de 2 a 4 aceitas: ${JSON.stringify(resultados)}`,
      );
      verificar(
        resultados.indices.mesa === 2 && resultados.indices.ativo === 0 && resultados.indices.voter === 0,
        `índices: ${JSON.stringify(resultados.indices)}`,
      );
      verificar(
        resultados.indices.votos.length === 0,
        `votos inválidos aceitos: ${resultados.indices.votos}`,
      );
      verificar(!resultados.proto.poluiu, "a mesa poluiu o protótipo");
      verificar(!resultados.html.xss, "um nome com HTML executou");
      verificar(resultados.origemFalsa.mesa === 0, "herói com origem falsa aceito");
      return Object.entries(resultados)
        .map(([k, v]) => `${k}:${v.mesa}`)
        .join(" ");
    },
  ],
];

let falhas = await executar("Testes do Modo Mesa local", casos);

// Uma partida inteira de mesa, só com toques, num iPhone, até o fim do Capítulo I.
{
  const servidor = await servirJogo();
  const browser = await abrirNavegador();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" }));
    localStorage.setItem("sen-narracao", JSON.stringify({ on: false }));
    localStorage.setItem("sen-audio", JSON.stringify({ music: false, sfx: false }));
  });
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  const inicio = Date.now();
  let resultado;
  try {
    await page.goto(servidor.url);
    await page.locator("#bMesa").tap();
    await page.locator("#mComecar").tap();
    let toques = 0;
    let parado = 0;
    let antes = "";
    for (; toques < 900; toques++) {
      const s = await page.evaluate(() => ({
        cena: state?.scene,
        fim: !!state?.flags?.cap1,
        combate: !!state?.combat,
        overlay: !document.getElementById("overlay").hidden,
        chave: JSON.stringify(state),
      }));
      if (s.fim) break;
      if (s.overlay) await page.locator("#eOk, #dClose, #achClose, #cardClose, #slotClose").first().tap();
      else if (s.combate) await page.locator("#aAtk").tap();
      else {
        const escolhas = page.locator("#choices .choice").filter({ hasNotText: "nova jornada" });
        const n = await escolhas.count();
        const alvo = escolhas.nth(Math.floor(Math.random() * n));
        await alvo.scrollIntoViewIfNeeded();
        await alvo.tap();
      }
      await page.waitForTimeout(40);
      parado = s.chave === antes ? parado + 1 : 0;
      antes = s.chave;
      if (parado >= 6) throw new Error(`travou em ${s.cena} (${s.combate ? "combate" : "cena"})`);
    }
    const fim = await page.evaluate(() => ({
      cap1: !!state.flags.cap1,
      pontos: state.mesa.heroes.map((h, i) => (i === state.mesa.active ? state.earned : h.earned)),
    }));
    verificar(fim.cap1, `não chegou ao fim do Capítulo I em ${toques} toques`);
    verificar(
      fim.pontos.every((p) => p > 0),
      `algum herói ficou sem pontos: ${fim.pontos}`,
    );
    verificar(!erros.length, erros.join("; "));
    resultado = `  ✓ partida de mesa por toques até o fim do Capítulo I · ${toques} toques, pontos ${fim.pontos.join("/")} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`;
  } catch (e) {
    falhas++;
    resultado = `  ✗ partida de mesa por toques até o fim do Capítulo I\n      ${String(e.message).split("\n")[0]}`;
  }
  console.log(resultado);
  await browser.close();
  await servidor.fechar();
}

process.exit(falhas ? 1 : 0);
