/**
 * Testes da Mesa online (fase 3): conexão direta entre aparelhos, convite de uso único,
 * contrassenha, aprovação, banimento, reconexão e ataques.
 *
 * Cada "aparelho" é um contexto separado do Chromium (armazenamento separado), todos na mesma
 * máquina. O WebRTC conecta em loopback, sem STUN (gancho de teste window.__senTesteIce = []).
 *
 * Uso: npm run test:conexao
 */
import { abrirNavegador, servirJogo, verificar } from "./lib/harness.mjs";

/* global S, J -- a sala do mestre e o jogador de cada página, criados dentro do navegador */

const servidor = await servirJogo();
const browser = await abrirNavegador();
let falhas = 0;
const abertos = [];

async function aparelho() {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__senTesteIce = [];
    localStorage.setItem("sen-cinema", JSON.stringify({ mode: "desligado" }));
    localStorage.setItem("sen-narracao", JSON.stringify({ on: false }));
  });
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto(servidor.url);
  await page.waitForTimeout(150);
  abertos.push(context);
  return { page, context, erros };
}

async function caso(nome, fn) {
  const inicio = Date.now();
  try {
    const detalhe = await fn();
    console.log(
      `  ✓ ${nome}${detalhe ? ` · ${detalhe}` : ""} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
    );
  } catch (e) {
    falhas++;
    console.log(`  ✗ ${nome}\n      ${String(e.message).split("\n")[0]}`);
  } finally {
    while (abertos.length) await abertos.pop().close();
  }
}

// ---------------------------------------------------------------- ajudantes (API do jogo)

const criarMestre = (p) => p.evaluate(() => (window.S = criarSalaMestre()) && S.mesaId);
/** Cria o convite do lugar n e escolhe a primeira das cinco contrassenhas (como o mestre faria). */
const convite = (p, n, escolha = 0) =>
  p.evaluate(
    async ([n, i]) => {
      const c = await S.criarConvite(n);
      const senha = await S.escolherSenha(n, i);
      return { convite: c.convite, opcoes: c.opcoes, senha };
    },
    [n, escolha],
  );
/** Na tela do mestre: escolhe uma das cinco contrassenhas, pede para mostrar e lê a escolhida. */
async function escolherNaTela(page, n, i = 0) {
  await page.click(`[data-acao="escolher"][data-n="${n}"][data-i="${i}"]`);
  await page.waitForSelector(`[data-acao="mostrar-senha"][data-n="${n}"]`);
  await page.click(`[data-acao="mostrar-senha"][data-n="${n}"]`);
  return page.locator(`[data-senha="${n}"]`).textContent();
}
const novoJogador = (p) => p.evaluate(() => (window.J = criarJogador()) && true);
const responder = (p, c, senha, nome = "Ailsa", autorizado = true) =>
  p.evaluate(([c, s, n, a]) => J.responder(c, s, n, a), [c, senha, nome, autorizado]);
const colar = (p, n, r) => p.evaluate(([n, r]) => S.receberResposta(n, r), [n, r]);
const estadoLugar = (p, n) => p.evaluate((n) => S.lugares[n].estado, n);
const esperarLugar = (p, n, estado, ms = 20000) =>
  p.waitForFunction(([n, e]) => S.lugares[n].estado === e, [n, estado], { timeout: ms });
const esperarJogador = (p, estado, ms = 20000) =>
  p.waitForFunction((e) => J.estado === e, estado, { timeout: ms });

/** Conecta um jogador ao lugar n e aprova. Devolve a página do jogador. */
async function entrar(mestre, n, nome = `Jogador ${n}`) {
  const { convite: c, senha } = await convite(mestre, n);
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, senha, nome);
  verificar(r.resposta, `o jogador não gerou resposta: ${r.erro}`);
  verificar((await colar(mestre, n, r.resposta)) === "", "o mestre recusou uma resposta válida");
  await esperarLugar(mestre, n, "pendente");
  await mestre.evaluate((n) => S.aprovar(n), n);
  await esperarJogador(j.page, "conectado");
  return j;
}

console.log("\nTestes da Mesa online (conexão segura)\n--------------------------------------");

await caso("mestre + 3 jogadores conectam, provam a contrassenha e são aprovados", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const jogadores = [];
  for (let n = 1; n <= 3; n++) jogadores.push(await entrar(m.page, n));
  const estados = await m.page.evaluate(() => [1, 2, 3].map((n) => S.lugares[n].estado));
  verificar(estados.join() === "conectado,conectado,conectado", `estados: ${estados}`);
  // Ping de ida e volta pelos dois lados.
  await m.page.evaluate(() => S.ping(1));
  await m.page.waitForFunction(() => S.lugares[1].ping !== null, null, { timeout: 5000 });
  await jogadores[0].page.evaluate(() => J.ping());
  await jogadores[0].page.waitForFunction(() => J.pingMs !== null, null, { timeout: 5000 });
  verificar(!m.erros.length && jogadores.every((j) => !j.erros.length), "erro de execução");
  return `ping ${await m.page.evaluate(() => S.lugares[1].ping)} ms`;
});

await caso("contrassenha errada é recusada (e conta como tentativa)", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { convite: c } = await convite(m.page, 1);
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, "lobo-urso-corvo-falcao-00");
  await colar(m.page, 1, r.resposta);
  await esperarJogador(j.page, "recusado");
  await m.page.waitForFunction(() => S.lugares[1].falhas === 1 && S.lugares[1].estado === "convite", null, {
    timeout: 15000,
  });
  verificar(
    await j.page.evaluate(() => /Contrassenha errada/.test(J.erro)),
    "o jogador não foi avisado da contrassenha errada",
  );
});

await caso("convite é de uso único: um segundo jogador com o mesmo convite é recusado", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { convite: c, senha } = await convite(m.page, 1);
  const j1 = await aparelho();
  await novoJogador(j1.page);
  const r1 = await responder(j1.page, c, senha, "Primeiro");
  await colar(m.page, 1, r1.resposta);
  await esperarLugar(m.page, 1, "pendente");
  const j2 = await aparelho();
  await novoJogador(j2.page);
  const r2 = await responder(j2.page, c, senha, "Segundo");
  const erro = await colar(m.page, 1, r2.resposta);
  verificar(erro, "o mestre aceitou um segundo jogador no mesmo convite");
  verificar((await m.page.evaluate(() => S.lugares[1].nome)) === "Primeiro", "o lugar mudou de dono");
});

await caso("resposta repetida (replay) é recusada", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { convite: c } = await convite(m.page, 1);
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, "senha-errada-qualquer-11");
  await colar(m.page, 1, r.resposta);
  await m.page.waitForFunction(() => S.lugares[1].estado === "convite" && S.lugares[1].falhas === 1, null, {
    timeout: 15000,
  });
  // O convite foi refeito; colar de novo a mesma resposta antiga não pode funcionar.
  const erro = await colar(m.page, 1, r.resposta);
  verificar(/já foi usada|outro convite|não está/.test(erro), `replay aceito: "${erro}"`);
});

await caso(
  '"homem no meio": trocar a resposta ou o convite sem saber a contrassenha não funciona',
  async () => {
    // 1) O atacante pega o convite e devolve uma resposta dele, chutando a contrassenha.
    const m = await aparelho();
    await criarMestre(m.page);
    const { convite: c } = await convite(m.page, 1);
    const atacante = await aparelho();
    await novoJogador(atacante.page);
    const ra = await responder(atacante.page, c, "chute-qualquer-senha-12", "Invasor");
    await colar(m.page, 1, ra.resposta);
    await esperarJogador(atacante.page, "recusado");
    verificar((await estadoLugar(m.page, 1)) !== "pendente", "o invasor chegou à aprovação");
    // 2) O atacante finge ser o mestre: dá ao jogador um convite dele e aceita qualquer prova.
    const falso = await aparelho();
    await criarMestre(falso.page);
    const { convite: cf } = await convite(falso.page, 1);
    await falso.page.evaluate(() => (NET.iguais = () => true)); // código do atacante no aparelho dele
    const j = await aparelho();
    await novoJogador(j.page);
    const rj = await responder(j.page, cf, "lobo-urso-corvo-falcao-01", "Vitima");
    await colar(falso.page, 1, rj.resposta);
    await esperarJogador(j.page, "recusado");
    verificar(
      await j.page.evaluate(() => /não provou/.test(J.erro)),
      `o jogador confiou num mestre falso: ${await j.page.evaluate(() => J.erro)}`,
    );
  },
);

await caso(
  "convites e respostas adulterados, gigantes ou bomba de compressão são recusados sem erro",
  async () => {
    const m = await aparelho();
    await criarMestre(m.page);
    await convite(m.page, 1);
    const j = await aparelho();
    await novoJogador(j.page);
    const lixos = await j.page.evaluate(async () => {
      const codigo = async (pref, obj) => NET.empacotar(pref, obj);
      const valido = await S_CONVITE_FALSO();
      async function S_CONVITE_FALSO() {
        return codigo("SENM1", {
          v: 1,
          mesaId: "A".repeat(22),
          lugar: 1,
          sal: "B".repeat(22),
          oferta: "v=0\r\nm=application 9 x\r\n",
        });
      }
      // Bomba: 3 MB de zeros comprimidos num código pequeno.
      const zeros = new Uint8Array(3_000_000);
      const z = await new Response(
        new Blob([zeros]).stream().pipeThrough(new CompressionStream("deflate-raw")),
      ).arrayBuffer();
      return [
        "",
        "lixo total",
        "SENM1.",
        "SENM1.z@@@",
        "SENM1.j" + NET.paraB64(new TextEncoder().encode("[1,2,3]")),
        "SENR1.j" + NET.paraB64(new TextEncoder().encode("{}")),
        "SENM1.z" + NET.paraB64(new Uint8Array(z)),
        "SENM1.j" + "A".repeat(2_000_000),
        valido,
        await codigo("SENM1", {
          v: 1,
          mesaId: "A".repeat(22),
          lugar: 99,
          sal: "B".repeat(22),
          oferta: "v=0",
        }),
        await codigo("SENM1", {
          v: 1,
          mesaId: "<img src=x onerror=window.__xss=1>",
          lugar: 1,
          sal: "B".repeat(22),
          oferta: "x",
          extra: 1,
        }),
      ];
    });
    for (const l of lixos) {
      const r = await responder(j.page, l, "lobo-urso-corvo-falcao-02");
      verificar(r.erro && !r.resposta, `convite inválido aceito: ${String(l).slice(0, 40)}`);
      const e = await colar(m.page, 1, l);
      verificar(e, `resposta inválida aceita: ${String(l).slice(0, 40)}`);
    }
    verificar((await estadoLugar(m.page, 1)) === "convite", "uma resposta inválida mexeu no lugar");
    verificar(!(await j.page.evaluate(() => window.__xss)), "um código executou HTML");
    verificar(!m.erros.length && !j.erros.length, `erro de execução: ${m.erros[0] || j.erros[0]}`);
    return `${lixos.length} códigos`;
  },
);

await caso("3 tentativas com contrassenha errada queimam o convite", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { senha } = await convite(m.page, 1);
  for (let t = 1; t <= 3; t++) {
    const c = await m.page.evaluate(() => S.lugares[1].convite);
    const j = await aparelho();
    await novoJogador(j.page);
    const r = await responder(j.page, c, `errada-${t}-senha-falsa-00`);
    await colar(m.page, 1, r.resposta);
    await esperarJogador(j.page, "recusado");
    await m.page.waitForFunction((t) => S.lugares[1].falhas === t, t, { timeout: 15000 });
    if (t < 3) await esperarLugar(m.page, 1, "convite");
  }
  await esperarLugar(m.page, 1, "queimado");
  verificar(
    (await m.page.evaluate(() => S.lugares[1].senha)) === null,
    "a contrassenha continuou na memória",
  );
  const erro = await colar(m.page, 1, "SENR1.qualquer");
  verificar(/queimado/.test(erro), `o lugar queimado aceitou resposta: ${erro}`);
  void senha;
});

await caso("nome hostil no pedido de entrada aparece como texto na tela do mestre", async () => {
  const m = await aparelho();
  await m.page.evaluate(() => {
    openMesaOnline();
    document.getElementById("privOk").click();
    document.getElementById("salaMestre").click();
  });
  await m.page.click('[data-acao="convite"][data-n="1"]');
  await m.page.waitForSelector('[data-acao="escolher"][data-n="1"]');
  const c = await m.page.evaluate(() => SALA.lugares[1].convite);
  const senha = await escolherNaTela(m.page, 1);
  const j = await aparelho();
  await novoJogador(j.page);
  const hostil = `<img src=x onerror="window.__xss=1">`;
  const r = await responder(j.page, c, senha, hostil.slice(0, 24));
  await m.page.fill('textarea[data-resp="1"]', r.resposta);
  await m.page.click('[data-acao="conectar"][data-n="1"]');
  await m.page.waitForFunction(() => SALA.lugares[1].estado === "pendente", null, { timeout: 20000 });
  const texto = await m.page.locator(".pedido").textContent();
  verificar(texto.includes("<img"), `o nome não apareceu como texto: ${texto}`);
  verificar(
    !(await m.page.evaluate(() => window.__xss || document.querySelector(".sala img[src='x']"))),
    "o nome virou HTML",
  );
});

await caso("enxurrada de mensagens desconecta o jogador", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const j = await entrar(m.page, 1);
  await j.page.evaluate(() => {
    for (let i = 0; i < 400; i++) J._enviarCru(JSON.stringify({ t: "ping", id: i }));
  });
  await esperarLugar(m.page, 1, "livre", 10000);
  verificar(
    /enxurrada/.test(await m.page.evaluate(() => S.lugares[1].ultimaFalha)),
    "o motivo não foi registrado",
  );
  await esperarJogador(j.page, "removido", 10000);
});

await caso(
  "mensagem gigante, JSON quebrado e tipo desconhecido são descartados; insistir desconecta",
  async () => {
    const m = await aparelho();
    await criarMestre(m.page);
    const j = await entrar(m.page, 1);
    const antes = await m.page.evaluate(() => JSON.stringify(Object.keys(S.lugares[1]).sort()));
    await j.page.evaluate(() => {
      J._enviarCru("x".repeat(20000));
      J._enviarCru("{quebrado");
      J._enviarCru(JSON.stringify({ t: "aprovado", ficha: "A".repeat(22), lugar: 1, recuperado: true }));
      J._enviarCru(JSON.stringify({ t: "entrar", nome: "Outro", ficha: null }));
      J._enviarCru(JSON.stringify({ t: "ping", id: 1, extra: "x" }));
      J._enviarCru(JSON.stringify({ __proto__: { polluted: 1 }, t: "ping", id: 2 }));
    });
    await m.page.waitForTimeout(800);
    verificar((await estadoLugar(m.page, 1)) === "conectado", "poucas mensagens inválidas já desconectaram");
    const depois = await m.page.evaluate(() => [
      JSON.stringify(Object.keys(S.lugares[1]).sort()),
      S.lugares[1].nome,
      {}.polluted,
    ]);
    verificar(
      depois[0] === antes && depois[1] === "Jogador 1" && depois[2] === undefined,
      `uma mensagem inválida mexeu no mestre: ${depois}`,
    );
    await j.page.evaluate(() => {
      for (let i = 0; i < 8; i++) J._enviarCru("{quebrado" + i);
    });
    await esperarLugar(m.page, 1, "livre", 10000);
  },
);

await caso(
  "banimento fecha a conexão e revoga a ficha; reconexão com a ficha certa recupera o lugar, com a errada não",
  async () => {
    const m = await aparelho();
    await criarMestre(m.page);
    const j = await entrar(m.page, 1, "Callum");
    const ficha = await j.page.evaluate(() => JSON.parse(localStorage.getItem("sen-mesa-ficha")).ficha);
    const hash = await m.page.evaluate(() => JSON.parse(localStorage.getItem("sen-mesa-mestre")).fichas[1]);
    verificar(
      /^[A-Za-z0-9_-]{22}$/.test(ficha) && /^[A-Za-z0-9_-]{43}$/.test(hash),
      "ficha ou resumo em formato inesperado",
    );
    verificar(
      !(await m.page.evaluate((f) => JSON.stringify(localStorage).includes(f), ficha)),
      "o mestre guardou a ficha em vez do resumo",
    );
    // Reconexão com a ficha certa.
    await j.page.evaluate(() => J.sair());
    await esperarLugar(m.page, 1, "livre", 10000);
    let { convite: c, senha } = await convite(m.page, 1);
    await novoJogador(j.page);
    let r = await responder(j.page, c, senha, "Callum");
    await colar(m.page, 1, r.resposta);
    await esperarLugar(m.page, 1, "pendente");
    verificar(await m.page.evaluate(() => S.lugares[1].recupera), "a ficha certa não foi reconhecida");
    await m.page.evaluate(() => S.aprovar(1));
    await esperarJogador(j.page, "conectado");
    verificar(await j.page.evaluate(() => J.recuperado === true), "o jogador não recuperou o lugar");
    // Banimento: fecha e revoga.
    await m.page.evaluate(() => S.remover(1));
    await esperarJogador(j.page, "removido", 10000);
    verificar(
      !(await m.page.evaluate(() => JSON.parse(localStorage.getItem("sen-mesa-mestre")).fichas[1])),
      "a ficha não foi revogada",
    );
    ({ convite: c, senha } = await convite(m.page, 1));
    await novoJogador(j.page);
    r = await responder(j.page, c, senha, "Callum");
    await colar(m.page, 1, r.resposta);
    await esperarLugar(m.page, 1, "pendente");
    verificar(
      !(await m.page.evaluate(() => S.lugares[1].recupera)),
      "uma ficha revogada ainda recuperou o lugar",
    );
    // Ficha adulterada também não recupera.
    await m.page.evaluate(() => S.aprovar(1));
    await esperarJogador(j.page, "conectado");
    await j.page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem("sen-mesa-ficha"));
      g.ficha = "Z".repeat(22);
      localStorage.setItem("sen-mesa-ficha", JSON.stringify(g));
      J.sair();
    });
    await esperarLugar(m.page, 1, "livre", 10000);
    ({ convite: c, senha } = await convite(m.page, 1));
    await novoJogador(j.page);
    r = await responder(j.page, c, senha, "Impostor");
    await colar(m.page, 1, r.resposta);
    await esperarLugar(m.page, 1, "pendente");
    verificar(
      !(await m.page.evaluate(() => S.lugares[1].recupera)),
      "uma ficha adulterada recuperou o lugar",
    );
  },
);

await caso('nenhum botão avança sem "Li e autorizo"', async () => {
  const p = await aparelho();
  await p.page.click("#bOnline");
  for (const id of ["#salaMestre", "#salaJogador"]) {
    verificar(await p.page.locator(id).isDisabled(), `${id} começa ativo`);
    await p.page.evaluate((id) => {
      const b = document.querySelector(id);
      b.disabled = false; // alguém mexendo na página
      b.click();
    }, id);
    verificar(await p.page.locator("#privOk").count(), `${id} avançou sem autorização`);
  }
  const r = await p.page.evaluate(async () => {
    abrirEntrada(false);
    const voltou = !!document.getElementById("privOk");
    const j = criarJogador();
    return [voltou, (await j.responder("SENM1.x", "a-b-c-d-00", "Nome", false)).erro];
  });
  verificar(r[0] && /autorizar/.test(r[1]), `sem autorização, algo avançou: ${r}`);
  await p.page.check("#privOk");
  await p.page.click("#salaJogador");
  verificar(await p.page.locator("#jGerar").count(), "com autorização, a entrada não abriu");
});

await caso(
  "a contrassenha não aparece no convite, na resposta nem no armazenamento do navegador",
  async () => {
    const m = await aparelho();
    await criarMestre(m.page);
    const { convite: c, senha } = await convite(m.page, 1);
    const conteudo = await m.page.evaluate(
      (c) => NET.desempacotar("SENM1", c).then((o) => JSON.stringify(o)),
      c,
    );
    const partes = senha.split("-");
    verificar(
      !conteudo.includes(senha) && !partes.slice(0, 5).some((p) => conteudo.includes(`"${p}`)),
      "a contrassenha foi no convite",
    );
    const j = await aparelho();
    await novoJogador(j.page);
    const r = await responder(j.page, c, senha);
    const resp = await j.page.evaluate(
      (r) => NET.desempacotar("SENR1", r).then((o) => JSON.stringify(o)),
      r.resposta,
    );
    verificar(!resp.includes(senha), "a contrassenha foi na resposta");
    await colar(m.page, 1, r.resposta);
    await esperarLugar(m.page, 1, "pendente");
    for (const p of [m.page, j.page]) {
      const armazenado = await p.evaluate(
        () => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
      );
      verificar(
        !armazenado.includes(senha) && !armazenado.includes(partes.slice(0, 5).join("-")),
        "a contrassenha foi parar no armazenamento",
      );
    }
    verificar(
      (await m.page.evaluate(() => [S.lugares[1].senha, S.lugares[1].chave])).every((x) => x === null),
      "a contrassenha ou a chave ficaram na memória depois de usadas",
    );
  },
);

await caso("a interface completa: mestre gera convite, jogador entra pela tela e é aprovado", async () => {
  const m = await aparelho();
  await m.page.click("#bOnline");
  await m.page.check("#privOk");
  await m.page.click("#salaMestre");
  await m.page.click('[data-acao="convite"][data-n="2"]');
  await m.page.waitForSelector('textarea[data-conv="2"]');
  const c = await m.page.locator('textarea[data-conv="2"]').inputValue();
  const senha = await escolherNaTela(m.page, 2, 3);
  const j = await aparelho();
  await j.page.click("#bOnline");
  await j.page.check("#privOk");
  await j.page.click("#salaJogador");
  await j.page.fill("#jConvite", c);
  await j.page.fill("#jSenha", ` ${senha.toUpperCase().replace(/-/g, " ")} `); // ditada com espaços e maiúsculas
  await j.page.fill("#jNome", "Mairi");
  await j.page.click("#jGerar");
  await j.page.waitForSelector("#jResposta", { timeout: 20000 });
  const r = await j.page.locator("#jResposta").inputValue();
  await m.page.fill('textarea[data-resp="2"]', r);
  await m.page.click('[data-acao="conectar"][data-n="2"]');
  await m.page.waitForSelector('[data-acao="aprovar"][data-n="2"]', { timeout: 20000 });
  await m.page.click('[data-acao="aprovar"][data-n="2"]');
  await j.page.waitForFunction(
    () => /Você está na mesa/.test(document.getElementById("jEstado")?.textContent || ""),
    null,
    { timeout: 20000 },
  );
  verificar(!m.erros.length && !j.erros.length, `erro de execução: ${m.erros[0] || j.erros[0]}`);
});

// ---------------------------------------------------------------- cinco opções para o mestre

await caso("o mestre recebe 5 contrassenhas diferentes, cada uma com 5 palavras e 2 dígitos", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const opcoes = await m.page.evaluate(async () => (await S.criarConvite(1)).opcoes);
  verificar(opcoes.length === 5 && new Set(opcoes).size === 5, `opções: ${opcoes.join(" | ")}`);
  for (const o of opcoes)
    verificar(/^([a-z]+-){5}\d{2}$/.test(o), `contrassenha fora do formato (5 palavras + 2 dígitos): ${o}`);
  const convite = await m.page.evaluate(() => S.lugares[1].convite);
  const conteudo = await m.page.evaluate(
    (c) => NET.desempacotar("SENM1", c).then((o) => JSON.stringify(o)),
    convite,
  );
  verificar(
    opcoes.every((o) => !conteudo.includes(o)),
    "uma opção de contrassenha foi parar no convite",
  );
  return opcoes[0];
});

await caso("resposta colada antes de o mestre escolher a contrassenha é recusada", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { convite: c, opcoes } = await m.page.evaluate(async () => S.criarConvite(1));
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, opcoes[0]);
  verificar(r.resposta, `o jogador não gerou resposta: ${r.erro}`);
  const erro = await colar(m.page, 1, r.resposta);
  verificar(/Escolha primeiro/.test(erro), `o lugar sem contrassenha escolhida aceitou resposta: "${erro}"`);
  verificar(
    (await estadoLugar(m.page, 1)) === "convite",
    "o lugar mudou de estado sem contrassenha escolhida",
  );
});

await caso("usar uma das quatro contrassenhas descartadas falha e conta como tentativa", async () => {
  const m = await aparelho();
  await criarMestre(m.page);
  const { convite: c, opcoes, senha } = await convite(m.page, 1, 2);
  verificar(senha === opcoes[2], "a contrassenha escolhida não é a opção tocada");
  verificar(
    (await m.page.evaluate(() => S.lugares[1].opcoes)) === null,
    "as outras opções continuaram na memória",
  );
  const descartada = opcoes[0];
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, descartada);
  await colar(m.page, 1, r.resposta);
  await esperarJogador(j.page, "recusado");
  await m.page.waitForFunction(() => S.lugares[1].falhas === 1, null, { timeout: 15000 });
  verificar(
    (await m.page.evaluate(() => S.lugares[1].ultimaFalha)) === "contrassenha errada",
    "a falha não foi registrada",
  );
});

await caso("a contrassenha escolhida fica fora da página até o mestre tocar em mostrar", async () => {
  const m = await aparelho();
  await m.page.evaluate(() => {
    openMesaOnline();
    document.getElementById("privOk").click();
    document.getElementById("salaMestre").click();
  });
  await m.page.click('[data-acao="convite"][data-n="1"]');
  await m.page.waitForSelector('[data-acao="escolher"][data-n="1"]');
  await m.page.click('[data-acao="escolher"][data-n="1"][data-i="1"]');
  // A escolha deriva a chave (PBKDF2), o que leva uma fração de segundo.
  await m.page.waitForFunction(() => !!SALA.lugares[1].senha && !!document.querySelector('[data-senha="1"]'));
  const senha = await m.page.evaluate(() => SALA.lugares[1].senha);
  const pagina = () => m.page.evaluate(() => document.documentElement.outerHTML);
  verificar(!(await pagina()).includes(senha), "a contrassenha escondida está no HTML da página");
  verificar(
    !(await pagina()).includes(senha.split("-").slice(0, 3).join("-")),
    "um pedaço da contrassenha escondida está na página",
  );
  await m.page.click('[data-acao="mostrar-senha"][data-n="1"]');
  verificar(
    (await m.page.locator('[data-senha="1"]').textContent()) === senha,
    "mostrar não exibiu a contrassenha",
  );
  await m.page.click('[data-acao="mostrar-senha"][data-n="1"]');
  verificar(!(await pagina()).includes(senha), "esconder não tirou a contrassenha da página");
});

await caso(
  "o mestre vê o aviso de tentativa errada com o contador e o convite queimado na terceira",
  async () => {
    const m = await aparelho();
    await m.page.evaluate(() => {
      openMesaOnline();
      document.getElementById("privOk").click();
      document.getElementById("salaMestre").click();
    });
    await m.page.click('[data-acao="convite"][data-n="1"]');
    await m.page.waitForSelector('[data-acao="escolher"][data-n="1"]');
    await escolherNaTela(m.page, 1);
    for (let t = 1; t <= 3; t++) {
      const c = await m.page.evaluate(() => SALA.lugares[1].convite);
      const j = await aparelho();
      await novoJogador(j.page);
      const r = await responder(j.page, c, "lobo-cardo-nevoa-ponte-urze-00");
      await m.page.evaluate(([r]) => SALA.receberResposta(1, r), [r.resposta]);
      await m.page.waitForFunction((t) => SALA.lugares[1].falhas === t, t, { timeout: 15000 });
      if (t < 3) {
        await m.page.waitForFunction(() => SALA.lugares[1].estado === "convite", null, { timeout: 15000 });
        const aviso = await m.page.locator('.lugar[data-lugar="1"] .aviso').textContent();
        verificar(
          aviso.includes("Alguém tentou entrar no lugar 1 com a contrassenha errada") &&
            aviso.includes(`tentativa ${t} de 3`),
          `aviso da tentativa ${t}: "${aviso}"`,
        );
      }
    }
    await m.page.waitForFunction(() => SALA.lugares[1].estado === "queimado", null, { timeout: 15000 });
    const final = await m.page.locator('.lugar[data-lugar="1"] .aviso').textContent();
    verificar(/queimado/i.test(final), `sem aviso de convite queimado: "${final}"`);
  },
);

await caso("o pedido de entrada só aparece com a contrassenha confirmada e mostra o selo", async () => {
  const m = await aparelho();
  await m.page.evaluate(() => {
    openMesaOnline();
    document.getElementById("privOk").click();
    document.getElementById("salaMestre").click();
  });
  await m.page.click('[data-acao="convite"][data-n="1"]');
  await m.page.waitForSelector('[data-acao="escolher"][data-n="1"]');
  const senha = await escolherNaTela(m.page, 1, 4);
  const c = await m.page.evaluate(() => SALA.lugares[1].convite);
  const j = await aparelho();
  await novoJogador(j.page);
  const r = await responder(j.page, c, senha, "Mairi");
  await m.page.fill('textarea[data-resp="1"]', r.resposta);
  await m.page.click('[data-acao="conectar"][data-n="1"]');
  await m.page.waitForSelector('[data-acao="aprovar"][data-n="1"]', { timeout: 20000 });
  const selo = await m.page.locator('.lugar[data-lugar="1"] .selo-ok').textContent();
  verificar(selo.includes("✓ contrassenha confirmada"), `sem o selo: "${selo}"`);
  await m.page.click('[data-acao="aprovar"][data-n="1"]');
  await esperarJogador(j.page, "conectado");
});

await browser.close();
await servidor.fechar();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
